interface AnswerDisplayProps {
  question: string;
  answer: string;
  context: string;
}

const contextLabels: Record<string, string> = {
  default: '予約方法',
  international_ng: '国際線制限',
  vehicles_ng: '車両制限',
  reservation_rules: '予約変更ルール',
  cancellation: 'キャンセル',
  fee_rules: '料金',
  other_contexts: 'その他'
};

export function AnswerDisplay({ question, answer, context }: AnswerDisplayProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-2">{question}</h2>
      <div className="text-gray-600 whitespace-pre-line">{answer}</div>
      <div className="mt-2 text-sm text-gray-500">
        カテゴリー: {contextLabels[context] || context}
      </div>
    </div>
  );
} 