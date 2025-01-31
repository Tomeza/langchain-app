'use client';

import { useState, useRef } from 'react';
import { RelatedQuestionButton } from './components/RelatedQuestionButton';
import { KnowledgeUploadBox } from './components/KnowledgeUploadBox';
import { AnswerDisplay } from './components/AnswerDisplay';
import { RelatedQuestions } from './components/RelatedQuestions';
import { SearchForm } from './components/SearchForm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ pageContent: string }>;
  relatedQuestions?: string[];
}

export default function Home() {
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const searchInProgress = useRef(false);

  const handleSearch = async (query: string, force: boolean = false) => {
    if (searchInProgress.current && !force) {
      return;
    }

    setIsSearching(true);
    searchInProgress.current = true;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error during search:', error instanceof Error ? error.message : 'Unknown error');
      setResult(null);
    } finally {
      setIsSearching(false);
      searchInProgress.current = false;
    }
  };

  const handleRelatedQuestionClick = (question: string) => {
    handleSearch(question, true);
  };

  const handleKnowledgeUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-knowledge', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('アップロードに失敗しました');
      }

      // 成功メッセージを表示など
    } catch (error) {
      console.error('Error:', error);
      // エラーメッセージを表示
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">駐車場予約Q&A</h1>
      <SearchForm onSearch={handleSearch} />
      {isSearching && (
        <div className="mt-4 text-gray-600">検索中...</div>
      )}
      {result && (
        <>
          <AnswerDisplay
            question={result.question}
            answer={result.answer}
            context={result.context}
          />
          {result.relatedQuestions.length > 0 && (
            <RelatedQuestions
              questions={result.relatedQuestions}
              onQuestionClick={handleRelatedQuestionClick}
            />
          )}
        </>
      )}
    </main>
  );
} 