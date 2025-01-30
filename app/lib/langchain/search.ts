import { VectorStore } from '@langchain/core/vectorstores';
import { Document } from '@langchain/core/documents';

interface SearchResult {
  question: string;
  answer: string;
  tags: string[];
  priority: string;
  purpose: string;
  score: number;
}

// メタデータの型定義
interface DocumentMetadata {
  question: string;
  answer: string;
  tags: string[];
  priority: string;
  purpose: string;
  score?: number;
}

// 車両名のパターン定義
const carPatterns = {
  foreignBrands: /(ベンツ|BMW|アウディ|ボルボ|プジョー|シトロエン|アストンマーチン|MINI|フォルクスワーゲン|テスラ|ポルシェ|ジャガー|ランドローバー)/i,
  luxuryJapanese: /(レクサス|FJクルーザー|ハイラックス|ランドクルーザー|プラド|グランドキャビン)/i,
  largeCars: /(キャラバン|ハイエース|パジェロ|プレジデント|グランエース)/i
};

// 検索前に質問をマッピング
function mapCarQuestion(query: string): string {
  if (carPatterns.foreignBrands.test(query)) {
    return "外車は駐車できますか？";
  }
  if (carPatterns.luxuryJapanese.test(query)) {
    return "高級車（レクサスなど）は駐車できますか？";
  }
  if (carPatterns.largeCars.test(query)) {
    return "車の大きさに制限はありますか？";
  }
  return query;
}

export async function searchKnowledge(
  vectorStore: VectorStore,
  query: string,
  topK: number = 3
): Promise<SearchResult[]> {
  const mappedQuery = mapCarQuestion(query);
  const results = await vectorStore.similaritySearch(mappedQuery, topK);
  
  return results.map((doc: Document) => {
    const metadata = doc.metadata as DocumentMetadata;
    return {
      question: metadata.question,
      answer: metadata.answer,
      tags: metadata.tags,
      priority: metadata.priority,
      purpose: metadata.purpose,
      score: metadata.score || 0
    };
  });
}

// コンテキストの型定義
export type SearchContext = 
  | 'default'           // 一般的な予約
  | 'international_ng'  // 国際線利用制限
  | 'vehicles_ng'       // 車両制限
  | 'reservation_rules' // 予約変更ルール
  | 'cancellation'     // キャンセル関連
  | 'other_contexts';   // その他

// タグマッピングの型定義
type TagMapping = {
  [key: string]: string[];
};

// コンテキストタグの型定義
type ContextTags = {
  [K in Exclude<SearchContext, 'other_contexts'>]: TagMapping;
};

// コンテキストごとのタグの関連性定義
const contextTags: ContextTags = {
  default: {
    '予約方法': ['インターネット予約', 'web予約限定', '予約条件', '電話問い合わせ'],
    'インターネット予約': ['予約方法', 'web予約限定'],
    '電話問い合わせ': ['予約方法', '軽自動車枠']
  },
  international_ng: {
    '国際線制限': ['利用不可', '出国', '帰国', '第3ターミナル', '国際線ターミナル'],
    '利用不可': ['見送り不可', '迎え不可', '施設利用不可'],
    '予約分割不可': ['併用不可', '国際線制限'],
    '国際線ターミナル': ['第3ターミナル', '施設利用不可']
  },
  vehicles_ng: {
    '車種制限': [
      '輸入車不可',
      '高級車不可',
      '対象外車種',
      '寸法制限',
      '特殊車両不可',
      'マニュアル車不可'
    ],
    '輸入車不可': ['車種制限', '高級車不可'],
    '高級車不可': ['車種制限', '輸入車不可'],
    '事前確認': ['車種確認', '代替車両予約'],
    '国産車案内': ['代替車両予約', '車種確認']
  },
  reservation_rules: {
    '予約変更': ['変更可能', '変更不可項目', '日程変更'],
    '予約条件': ['仮押さえ不可', '分割予約不可', '時間制限'],
    '利用延長': ['予約変更', '特例対応'],
    '変更可能': ['予約変更', '日程変更'],
    '変更不可項目': ['予約変更', '予約条件']
  },
  cancellation: {
    'キャンセル手続き': ['キャンセル料', '欠航対応'],
    'キャンセル待ち': ['空き状況', 'リアルタイム予約']
  }
};

// 関連質問を取得する関数（コンテキスト対応）
export async function getRelatedQuestions(
  vectorStore: VectorStore,
  currentQuestion: string,
  currentTags: string[],
  context: SearchContext = 'default',
  maxQuestions: number = 3
): Promise<string[]> {
  const results = await vectorStore.similaritySearch(
    currentQuestion,
    7
  );

  console.log('Debug - Context:', context);
  console.log('Debug - Current tags:', currentTags);

  // タグの関連性チェック関数
  const isTagRelated = (tag1: string, tag2: string, context: Exclude<SearchContext, 'other_contexts'>): boolean => {
    const words1 = tag1.trim().toLowerCase();
    const words2 = tag2.trim().toLowerCase();

    if (words1 === words2) return true;

    const contextualTags = contextTags[context] || contextTags.default;
    // タグの関連性をより詳細にチェック
    const isRelated = (
      // 直接的な関連性
      contextualTags[words1]?.includes(words2) || 
      contextualTags[words2]?.includes(words1) ||
      // 間接的な関連性（共通の親タグを持つ）
      Object.entries(contextualTags).some(([parentTag, relatedTags]) => 
        relatedTags.includes(words1) && relatedTags.includes(words2)
      )
    );

    if (isRelated) {
      console.log(`Customer flow [${context}]: ${words1} → ${words2}`);
      return true;
    }

    return false;
  };

  const filtered = results
    .filter(doc => {
      const metadata = doc.metadata as DocumentMetadata;
      return metadata.question !== currentQuestion;
    })
    .filter(doc => {
      console.log('Debug - Full doc:', JSON.stringify(doc, null, 2));
      
      const metadata = doc.metadata as DocumentMetadata;
      // メタデータのタグが存在することを確認
      if (!metadata.tags) return false;
      
      // 少なくとも1つの関連タグがあるかチェック
      const hasRelatedTag = currentTags.some(currentTag =>
        metadata.tags.some(docTag =>
          isTagRelated(currentTag, docTag, context as Exclude<SearchContext, 'other_contexts'>)
        )
      );

      console.log('Debug - Question:', metadata.question, 
        'Context:', context,
        'Tags:', metadata.tags,
        'Has related tag:', hasRelatedTag
      );
      return hasRelatedTag;
    });

  return filtered
    .slice(0, maxQuestions)
    .map(doc => (doc.metadata as DocumentMetadata).question);
} 