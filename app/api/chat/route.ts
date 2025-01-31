import { NextResponse } from 'next/server';
import { getVectorStore } from '../../lib/langchain/vectorstore';
import { searchKnowledge, getRelatedQuestions } from '@/lib/langchain/search';
import { Document } from '@langchain/core/documents';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { MemoryVectorStore } from "langchain/vectorstores/memory";

export const runtime = 'nodejs';

// vectorStoreの状態を保持
let vectorStore: MemoryVectorStore | null = null;

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    // クエリの検証
    const { query } = await request.json();
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: '検索クエリを入力してください' },
        { status: 400 }
      );
    }

    console.log('Received query:', query);

    // VectorStoreの初期化を確認
    if (!vectorStore) {
      console.log('Initializing vector store...');
      vectorStore = await getVectorStore();
    }

    // 最も関連性の高いドキュメントを取得
    const results = await vectorStore.similaritySearch(query, 6);  // より多くの関連ドキュメントを取得
    
    if (results.length === 0) {
      return NextResponse.json({
        question: query,
        answer: "申し訳ありません。該当する情報が見つかりませんでした。",
        context: "not_found",
        relatedQuestions: []
      });
    }

    // メインの回答を取得
    const mainDoc = results[0];
    
    // 関連する情報を収集
    // 親子関係だけでなく、タグベースでも関連情報を収集
    const childDocs = results
      .filter(doc => 
        doc.metadata.parent_id === mainDoc.metadata.id ||
        doc.metadata.tags.split(',').some(tag => 
          mainDoc.metadata.tags.split(',').includes(tag.trim())
        )
      );
    
    // ChatGPTを使用して対話的な回答を生成
    const chat = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      temperature: 0
    });

    const systemPrompt = `
    あなたは駐車場予約システムのカスタマーサポート担当です。
    以下の情報に基づいて、正確で丁寧な回答を生成してください：
    
    回答情報：
    ${mainDoc.metadata.answer}
    ${childDocs.map(doc => doc.metadata.answer).join('\n')}
    
    回答形式：
    1. 「お世話になっております。パーク&ライド羽田でございます。」で開始
    2. ユーザーの質問に対する直接的な回答
    3. 関連する制限事項や注意点の説明
    4. 「ご不明な点がございましたら、お気軽にお申し付けください。」で締めくくり
    
    制約事項：
    - 提供された情報のみを使用し、推測や追加情報は含めない
    - 具体的な数値や条件は原文の通りに記載
    - 説明は箇条書きを使用して明確に構造化する
    - 常に丁寧な敬語を使用する
    `;

    const response = await chat.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`
        以下の質問に対して、駐車場予約システムのカスタマーサポートとして回答してください。
        
        質問: ${query}
        
        回答は必ず提供された情報の範囲内で、具体的かつ正確に行ってください。
      `)
    ]);

    // 関連質問を取得（メインの回答とは異なるものを取得）
    const relatedQuestions = results
      .slice(1) // メインの回答を除外
      .map(doc => doc.metadata.question)
      .filter(q => q !== mainDoc.metadata.question) // メインの質問を除外
      .filter((q, i, self) => self.indexOf(q) === i) // 重複を除外
      .slice(0, 3); // 最大3つまでに制限

    return NextResponse.json({
      question: mainDoc.metadata.question,
      answer: response.content,
      context: mainDoc.metadata.context,
      relatedQuestions: relatedQuestions
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 