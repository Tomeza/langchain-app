import React from 'react';

interface KnowledgeUploadBoxProps {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  lastUploadResult?: {
    success: boolean;
    message: string;
    recordCount?: number;
  };
}

export function KnowledgeUploadBox({ onUpload, isUploading, lastUploadResult }: KnowledgeUploadBoxProps) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      await onUpload(file);
    }
  };

  return (
    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
      <div className="text-center">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          id="csv-upload"
          disabled={isUploading}
        />
        <label
          htmlFor="csv-upload"
          className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md
            hover:bg-blue-600 transition-colors duration-200"
        >
          {isUploading ? 'アップロード中...' : 'CSVファイルを選択'}
        </label>
        <p className="mt-2 text-sm text-gray-600">
          ナレッジベースとして使用するCSVファイルをアップロードしてください
        </p>

        {/* アップロード結果の表示 */}
        {lastUploadResult && (
          <div className={`mt-4 p-3 rounded-md ${
            lastUploadResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            <p>{lastUploadResult.message}</p>
            {lastUploadResult.recordCount && (
              <p className="mt-1 text-sm">
                {lastUploadResult.recordCount}件のレコードを読み込みました
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 