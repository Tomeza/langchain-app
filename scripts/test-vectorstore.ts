import { createVectorStore } from '../app/lib/langchain/vectorstore';
import { searchKnowledge, getRelatedQuestions, SearchContext } from '../app/lib/langchain/search';
import { VectorStore } from '@langchain/core/vectorstores';
import path from 'path';
import { Document } from '@langchain/core/documents';

// タグの型を定義
type TagString = string;

// メタデータの型定義
interface DocumentMetadata {
  question: string;
  answer: string;
  tags: TagString[];
  priority: string;
  purpose: string;
}

// コンテキストごとのタグ定義をより具体的に
const contextTags: Record<Exclude<SearchContext, 'other_contexts'>, Record<string, string[]>> = {
  default: {
    '予約方法': ['インターネット予約', 'web予約限定', '予約条件', '電話問い合わせ'],
    'インターネット予約': ['予約方法', 'web予約限定']
  },
  international_ng: {
    '国際線制限': ['利用不可', '出国', '帰国', '第3ターミナル', '国際線専用'],
    '利用不可': ['見送り不可', '迎え不可', '施設利用不可']
  },
  vehicles_ng: {
    '車種制限': [
      '輸入車不可',
      '高級車不可',
      '予約不可',
      '対象外車種',
      '寸法制限',
      '特殊車両不可',
      'マニュアル車不可',
      'サイズ確認'
    ],
    '事前確認': ['車種確認', '代替車両予約'],
    '国産車案内': ['代替車両予約', '車種確認']
  },
  reservation_rules: {
    '予約変更': ['変更可能', '変更不可項目', '日程変更'],
    '予約条件': ['仮押さえ不可', '分割予約不可', '時間制限'],
    '利用延長': ['予約変更', '特例対応']
  },
  cancellation: {
    'キャンセル': ['キャンセル手続き', 'キャンセル料'],
    'キャンセル手続き': ['キャンセル', 'キャンセル料'],
    'キャンセル料': ['キャンセル', 'キャンセル手続き']
  },
  fee_rules: {
    '深夜料金': ['料金詳細', '追加料金'],
    '追加料金': ['深夜料金', '料金詳細'],
    '料金詳細': ['深夜料金', '追加料金']
  }
};

// テスト用のヘルパー関数を追加
async function testRelatedQuestions(
  vectorStore: VectorStore,
  query: string,
  tags: string[],
  context: SearchContext
) {
  console.log('Query:', query);
  console.log('Tags:', tags);

  const relatedQuestions = await getRelatedQuestions(
    vectorStore,
    query,
    tags.map(tag => tag.toLowerCase().trim()),
    context
  );
  console.log(`Related questions [${context}]:`, relatedQuestions);
}

async function testVectorStore() {
  try {
    // 1. ベクトルストア作成テスト
    console.log('Creating vector store...');
    const csvPath = path.join(process.cwd(), 'data', 'knowledge.csv');
    const vectorStore = await createVectorStore(csvPath);

    // ロードされたデータの詳細確認
    console.log('\nChecking loaded data...');
    const allDocs = await vectorStore.similaritySearch('', 20);
    console.log('Total documents:', allDocs.length);
    console.log('Documents by context:');
    const contexts = ['default', 'international_ng', 'vehicles_ng', 'reservation_rules', 'cancellation'];
    for (const ctx of contexts) {
      const docsInContext = allDocs.filter((doc: Document) => {
        const metadata = doc.metadata as DocumentMetadata;
        const tags = Array.isArray(metadata?.tags) ? metadata.tags :
          (metadata?.tags ? String(metadata.tags).split(',').map(t => t.trim()) : []);
        
        return tags.some((tag: string) => 
          contextTags[ctx as Exclude<SearchContext, 'other_contexts'>] && 
          Object.keys(contextTags[ctx as Exclude<SearchContext, 'other_contexts'>]).includes(tag)
        );
      });
      console.log(`\n${ctx}:`, docsInContext.length, 'documents');
      console.log(docsInContext.map((doc: Document) => ({
        question: (doc.metadata as DocumentMetadata).question,
        tags: (doc.metadata as DocumentMetadata).tags
      })));
    }

    // コンテキストごとのテストケース定義
    const testCases = {
      default: {
        query: '予約方法を教えてください',
        tags: ['予約方法', 'インターネット予約']
      },
      international_ng: {
        query: '国際線利用で予約できますか？',
        tags: ['国際線制限', '利用不可']
      },
      vehicles_ng: {
        query: '外車は駐車できますか？',
        tags: ['車種制限', '輸入車不可']
      },
      reservation_rules: {
        query: '予約の変更はできますか？',
        tags: ['予約変更', '変更可能']
      }
    };

    // 各コンテキストでのテスト実行
    for (const [context, testCase] of Object.entries(testCases)) {
      console.log(`\nTesting related questions for context: ${context}`);
      console.log('Query:', testCase.query);
      console.log('Tags:', testCase.tags);

      const relatedQuestions = await getRelatedQuestions(
        vectorStore,
        testCase.query,
        testCase.tags.map(tag => tag.toLowerCase().trim()),
        context as SearchContext
      );
      console.log(`Related questions [${context}]:`, relatedQuestions);
    }

    // キャンセル関連のテスト
    console.log('\nTesting related questions for context: cancellation');
    await testRelatedQuestions(
      vectorStore,
      'キャンセル方法を教えてください',
      ['キャンセル手続き', 'キャンセル'],
      'cancellation'
    );

    // 料金関連のテスト
    console.log('\nTesting related questions for context: fee_rules');
    await testRelatedQuestions(
      vectorStore,
      '深夜料金について教えてください',
      ['深夜料金', '追加料金'],
      'fee_rules'
    );

  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}

testVectorStore();