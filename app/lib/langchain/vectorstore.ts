import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import path from 'path';
import fs from 'fs';

// メタデータの型を定義
interface DocumentMetadata {
  id: string;
  question: string;
  answer: string;
  parent_id: string;
  tags: string;
  priority: string;
  purpose: string;
  chunk_type: string;
  context: string;
}

// シングルトンインスタンスを保持するクラス
class VectorStoreManager {
  private static instance: VectorStoreManager;
  private vectorStore: MemoryVectorStore | undefined;

  private constructor() {}

  public static getInstance(): VectorStoreManager {
    if (!VectorStoreManager.instance) {
      VectorStoreManager.instance = new VectorStoreManager();
    }
    return VectorStoreManager.instance;
  }

  public async getVectorStore(csvPath?: string): Promise<MemoryVectorStore> {
    if (this.vectorStore) {
      return this.vectorStore;
    }

    const defaultPath = path.join(process.cwd(), 'data', 'knowledge.csv');
    const targetPath = csvPath || defaultPath;

    try {
      const csvContent = fs.readFileSync(targetPath, 'utf-8');
      const rows = csvContent.split('\n').slice(1);
      
      const docs = rows
        .filter(row => row.trim())
        .map(row => {
          const [id, question, answer, parent_id, tags, priority, purpose, chunk_type] = row
            .split(',')
            .map(field => field.replace(/^"|"$/g, '').replace(/\\n/g, '\n'));
          
          const metadata: DocumentMetadata = {
            id,
            question,
            answer,
            parent_id,
            context: tags.split(',')[0].trim(),
            tags: tags,
            priority,
            purpose,
            chunk_type
          };
          
          // 検索用のコンテンツを構築
          return new Document({
            pageContent: `
              ${chunk_type === 'parent' ? question : ''}
              ${tags}
              ${purpose}
            `.trim(),
            metadata
          });
        });

      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: "text-embedding-ada-002"
      });

      this.vectorStore = new MemoryVectorStore(embeddings);
      await this.vectorStore.addDocuments(docs);
      
      return this.vectorStore;
    } catch (error) {
      console.error('Error creating vector store:', error);
      throw error;
    }
  }
}

export async function getVectorStore(csvPath?: string): Promise<MemoryVectorStore> {
  const manager = VectorStoreManager.getInstance();
  return manager.getVectorStore(csvPath);
}
