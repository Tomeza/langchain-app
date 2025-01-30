import { Document } from '@langchain/core/documents';
import * as fs from 'fs';
import * as csv from 'csv-parse/sync';

export async function loadCSV(filePath: string) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = csv.parse(fileContent, {
    columns: true,
    skip_empty_lines: true
  });

  return records.map((record: any) => {
    // エスケープ文字を適切に処理
    const answer = record.回答.replace(/\\n/g, '\n');
    const content = `質問: ${record.質問}\n回答: ${answer}`;
    
    return new Document({
      pageContent: content,
      metadata: {
        question: record.質問,
        answer: answer,  // エスケープ処理済みの回答を使用
        tags: record.タグ?.split(',').map(tag => tag.trim()) || [],
        priority: record.優先度,
        purpose: record['解決する課題']
      }
    });
  });
} 