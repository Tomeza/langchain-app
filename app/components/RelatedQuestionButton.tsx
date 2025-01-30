interface RelatedQuestionButtonProps {
  question: string;
  onClick: (question: string) => void;
}

export function RelatedQuestionButton({ question, onClick }: RelatedQuestionButtonProps) {
  return (
    <button
      onClick={() => onClick(question)}
      className="w-full p-2 text-left text-sm 
        bg-white rounded-lg shadow-sm
        text-gray-900
        hover:bg-gray-50 hover:shadow hover:text-blue-600
        active:bg-gray-100
        transition-all duration-200
        border border-gray-200"
    >
      {question}
    </button>
  );
} 