import { NextResponse } from 'next/server';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { getVectorStore } from '../../../lib/langchain/vectorstore';
import { Document } from '@langchain/core/documents';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';

export const runtime = 'nodejs';

// vectorStoreの状態を保持
let vectorStore: Chroma | null = null;

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const { query } = await request.json();
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }
    
    console.log('Received query:', query);
    
    // VectorStoreの初期化を確認
    if (!vectorStore) {
      console.log('Initializing vector store...');
      vectorStore = await getVectorStore();
    }
    
    // 関連ドキュメントを検索
    const docs = await vectorStore.similaritySearch(query, 6);
    console.log('Search results:', docs);
    
    const model = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      temperature: 0,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    // コンテキストを準備（最初の4つのドキュメントを使用）
    const context = docs.slice(0, 4).map((doc) => doc.pageContent).join('\n');

    // メッセージを準備（回答用）
    const answerMessages = [
      new SystemMessage(`以下の文脈を参考に、質問に日本語で答えてください。
文脈に含まれていない情報については、「申し訳ありませんが、その情報は提供できません」と回答してください。

文脈:
${context}`),
      new HumanMessage(query)
    ];

    // 関連質問生成用のメッセージを準備
    const suggestMessages = [
      new SystemMessage(`以下の文脈と質問を参考に、ユーザーが次に尋ねそうな関連質問を3つ生成してください。
質問はJSON形式の配列で返してください。例: ["質問1", "質問2", "質問3"]

文脈:
${docs.map((doc: { pageContent: string }) => doc.pageContent).join('\n')}

元の質問: ${query}`),
      new HumanMessage("関連質問を3つ生成してください。")
    ];

    // 並行して回答と関連質問を取得
    const [response, suggestResponse] = await Promise.all([
      model.invoke(answerMessages),
      model.invoke(suggestMessages)
    ]);
    
    // 関連質問をパース
    let relatedQuestions: string[] = [];
    try {
      relatedQuestions = JSON.parse(suggestResponse.content);
      console.log('Parsed relatedQuestions:', relatedQuestions);
    } catch (error) {
      console.error('Error parsing related questions:', error);
      console.error('Raw content:', suggestResponse.content);
      relatedQuestions = [];
    }
    
    console.log('Response:', response);
    console.log('Related questions:', relatedQuestions);
    
    return NextResponse.json({ 
      answer: response.content,
      sources: docs.slice(0, 4),
      relatedQuestions
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 