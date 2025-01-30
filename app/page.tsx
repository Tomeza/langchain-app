'use client';

import { useState } from 'react';
import { RelatedQuestionButton } from './components/RelatedQuestionButton';
import { KnowledgeUploadBox } from './components/KnowledgeUploadBox';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ pageContent: string }>;
  relatedQuestions?: string[];
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage: Message = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setQuery('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      if (response.ok) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
          relatedQuestions: data.relatedQuestions
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          role: 'assistant',
          content: `エラー: ${data.error}`
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'エラー: リクエストに失敗しました'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleRelatedQuestionClick = (question: string) => {
    setQuery(question);
    handleSubmit(new Event('submit') as any);
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
    <main className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">LangChain チャットボット</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <h2 className="text-lg font-semibold mb-3">ナレッジベース</h2>
            <KnowledgeUploadBox
              onUpload={handleKnowledgeUpload}
              isUploading={isUploading}
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`p-4 rounded ${
                  message.role === 'user'
                    ? 'bg-blue-100 ml-auto max-w-[80%]'
                    : 'bg-gray-100 mr-auto max-w-[80%]'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p className="font-semibold">参照情報:</p>
                    <ul className="list-disc pl-4">
                      {message.sources.map((source, idx) => (
                        <li key={idx}>{source.pageContent}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {message.relatedQuestions && message.relatedQuestions.length > 0 && (
                  <div className="mt-4 relative isolate">
                    <p className="font-semibold text-sm text-gray-600">関連する質問:</p>
                    <div className="space-y-2 mt-2">
                      {message.relatedQuestions.map((question, idx) => (
                        <RelatedQuestionButton
                          key={idx}
                          question={question}
                          onClick={handleRelatedQuestionClick}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="bg-gray-100 p-4 rounded mr-auto max-w-[80%]">
                <div className="flex space-x-2">
                  <div className="animate-bounce">●</div>
                  <div className="animate-bounce delay-100">●</div>
                  <div className="animate-bounce delay-200">●</div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="質問を入力してください..."
              className="w-full p-2 border rounded"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400 hover:bg-blue-600 transition-colors"
            >
              {loading ? '処理中...' : '送信'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
} 