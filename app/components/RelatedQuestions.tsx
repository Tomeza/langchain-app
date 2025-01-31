interface RelatedQuestionsProps {
  questions: string[];
  onQuestionClick: (question: string) => void;
}

export function RelatedQuestions({ questions, onQuestionClick }: RelatedQuestionsProps) {
  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">関連する質問</h3>
      <ul className="space-y-2">
        {questions.map((question, index) => (
          <li key={index}>
            <button
              onClick={() => onQuestionClick(question)}
              type="button"
              className="text-blue-600 hover:text-blue-800 hover:underline text-left"
            >
              {question}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
} 