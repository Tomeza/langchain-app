import { VectorStore } from '@langchain/core/vectorstores';
import { Document } from '@langchain/core/documents';

export type SearchContext = 
  | 'default'           // 予約方法
  | 'international_ng'  // 国際線制限
  | 'vehicles_ng'       // 車両制限
  | 'reservation_rules' // 予約変更ルール
  | 'cancellation'      // キャンセル関連
  | 'fee_rules'         // 料金関連
  | 'other_contexts';   // その他

interface SearchResult {
  question: string;
  answer: string;
  tags: string[];
  priority: string;
  purpose: string;
  context: SearchContext;
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

// コンテキストの判定関数
function getDocumentContext(tags: string[]): SearchContext {
  const tagStr = tags.join(',').toLowerCase();
  
  if (tagStr.includes('キャンセル')) return 'cancellation';
  if (tagStr.includes('深夜料金') || tagStr.includes('追加料金') || tagStr.includes('料金詳細')) return 'fee_rules';
  if (tagStr.includes('予約方法')) return 'default';
  if (tagStr.includes('国際線')) return 'international_ng';
  if (tagStr.includes('車種制限')) return 'vehicles_ng';
  if (tagStr.includes('予約変更')) return 'reservation_rules';
  
  return 'other_contexts';
}

// 知識ベース検索関数
export async function searchKnowledge(
  vectorStore: VectorStore,
  query: string,
  topK: number = 3
): Promise<SearchResult[]> {
  const results = await vectorStore.similaritySearch(query, topK);
  
  return results
    .map((doc: Document) => {
      const metadata = doc.metadata as DocumentMetadata;
      const context = getDocumentContext(metadata.tags);
      return {
        question: metadata.question,
        answer: metadata.answer,
        tags: metadata.tags,
        priority: metadata.priority,
        purpose: metadata.purpose,
        context: context,
        score: metadata.score || 0
      };
    })
    .filter(result => result.context !== 'other_contexts');
}

// 関連質問取得関数
export async function getRelatedQuestions(
  vectorStore: VectorStore,
  currentQuestion: string,
  currentTags: string[],
  context: SearchContext = 'default',
  maxQuestions: number = 3
): Promise<string[]> {
  const results = await vectorStore.similaritySearch(currentQuestion, 7);

  const filtered = results
    .filter(doc => {
      const metadata = doc.metadata as DocumentMetadata;
      return metadata.question !== currentQuestion &&
             getDocumentContext(metadata.tags) === context;
    })
    .map(doc => (doc.metadata as DocumentMetadata).question)
    .slice(0, maxQuestions);

  return filtered;
}

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
    'キャンセル': ['手続き', '料金', 'キャンセル料'],
    '手続き': ['キャンセル', 'キャンセル料'],
    '料金': ['キャンセル', 'キャンセル料']
  },
  fee_rules: {
    '料金': ['深夜料金', '追加料金', '延長料金'],
    '深夜料金': ['料金', '追加料金'],
    '追加料金': ['料金', '深夜料金']
  }
}; 