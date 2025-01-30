import { Chroma, type ChromaLibArgs, type ChromaDeleteParams } from '@langchain/community/vectorstores/chroma';
import type { VectorStore } from '@langchain/core/vectorstores';
import type { BaseRetriever } from '@langchain/core/retrievers';
import { Embeddings as EmbeddingsInterface } from '@langchain/core/embeddings';
import { embeddings } from './config';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { Document } from '@langchain/core/documents';
import fs from 'fs';

// ChromaDBのWhere句の型定義
type Where = {
  [key: string]: any;
};

// VectorStoreの型を拡張してChromaの型を定義
class ExtendedChroma implements VectorStore {
  private dbConfig: ChromaLibArgs;
  protected embeddings: EmbeddingsInterface;
  private chroma: Chroma;

  constructor(embeddings: EmbeddingsInterface, args: ChromaLibArgs) {
    this.chroma = new Chroma(embeddings, args);
    this.dbConfig = args;
    this.embeddings = embeddings;
  }

  async similaritySearch(query: string, k?: number): Promise<Document[]> {
    try {
      const results = await this.chroma.similaritySearch(query, k);
      const uniqueResults = Array.from(
        new Map(
          results.map((doc: Document) => [
            doc.metadata?.question || doc.pageContent,
            doc
          ])
        ).values()
      ) as Document[];

      // より柔軟なフィルタリング条件
      const filteredResults = uniqueResults.filter(doc => {
        // メタデータの基本チェック
        if (!doc.metadata) return false;
        
        // 必須フィールドの存在チェック
        const hasRequiredFields = doc.metadata.question && 
          doc.pageContent && 
          doc.metadata.answer;
        
        // タグのチェック（オプショナル）
        const hasTags = Array.isArray(doc.metadata.tags);
        
        return hasRequiredFields && hasTags;
      });

      // デバッグ情報の出力
      if (filteredResults.length > 0) {
        console.debug('Debug - Full doc:', JSON.stringify(filteredResults[0], null, 2));
      }

      console.debug('Search results:', results.length);
      console.debug('Filtered results:', filteredResults.length);
      return filteredResults;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  asRetriever(kwargs?: { k?: number }): BaseRetriever {
    return this.chroma.asRetriever(kwargs);
  }

  async addDocuments(documents: Document[]): Promise<void> {
    await this.chroma.addDocuments(documents);
  }

  async addVectors(vectors: number[][], documents: Document[]): Promise<void> {
    await this.chroma.addVectors(vectors, documents);
  }

  async similaritySearchVectorWithScore(
    query: number[],
    k: number = 4
  ): Promise<[Document, number][]> {
    return this.chroma.similaritySearchVectorWithScore(query, k);
  }

  async delete(params?: ChromaDeleteParams<Where>): Promise<void> {
    const defaultParams = { ids: [] };
    try {
      const finalParams = params ?? defaultParams;
      await this.chroma.delete(finalParams);
    } catch (error) {
      console.error('ChromaDB v1.10.4 delete error:', error);
      throw error;
    }
  }

  static async fromTexts(
    texts: string[],
    metadatas: object[] | object,
    embeddings: EmbeddingsInterface,
    dbConfig: ChromaLibArgs
  ): Promise<ExtendedChroma> {
    const chroma = await Chroma.fromTexts(texts, metadatas, embeddings, dbConfig);
    const instance = new ExtendedChroma(embeddings, dbConfig);
    instance.chroma = chroma;
    return instance;
  }

  static async fromDocuments(
    docs: Document[],
    embeddings: EmbeddingsInterface,
    dbConfig: ChromaLibArgs
  ): Promise<ExtendedChroma> {
    const chroma = await Chroma.fromDocuments(docs, embeddings, dbConfig);
    const instance = new ExtendedChroma(embeddings, dbConfig);
    instance.chroma = chroma;
    return instance;
  }

  static async fromExistingCollection(
    embeddings: EmbeddingsInterface,
    dbConfig: ChromaLibArgs
  ): Promise<ExtendedChroma> {
    const chroma = await Chroma.fromExistingCollection(embeddings, dbConfig);
    const instance = new ExtendedChroma(embeddings, dbConfig);
    instance.chroma = chroma;
    return instance;
  }
}

export async function createVectorStore(csvPath: string): Promise<VectorStore> {
  try {
    console.log('Loading CSV file...');
    const csvContent = await fs.promises.readFile(csvPath, 'utf-8');
    const docs = parseCSV(csvContent);
    console.log('Loaded documents:', docs.length);
    console.log('Sample document:', JSON.stringify(docs[0], null, 2));

    // ChromaDBの設定
    const collection = await ExtendedChroma.fromDocuments(
      docs,
      embeddings,
      {
        collectionName: "park_and_ride",
        url: process.env.CHROMADB_URL,
      }
    );

    console.log('Vector store created successfully');
    return collection;
  } catch (error) {
    console.error('Error creating vector store:', error);
    throw error;
  }
}

function parseCSV(csvContent: string): Array<Document> {
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ',',
    from_line: 1,
    relax_column_count: false
  });

  if (!Array.isArray(rows)) {
    throw new Error('Failed to parse CSV: rows is not an array');
  }

  // デバッグ用：CSVの内容を確認
  console.log('First row of CSV:', rows[0]);

  return rows.map(row => {
    // タグを配列として処理
    const tags = typeof row.タグ === 'string' 
      ? row.タグ.split(/[,;]/).map((tag: string) => tag.trim())
        .filter((tag: string) => tag !== '')
        .map((tag: string) => tag.toLowerCase())  // タグを小文字に統一
      : [];

    // デバッグ用：生成されたタグを確認
    console.log('Processed tags:', tags);

    // 回答フィールドの正規化
    const answer = Array.isArray(row.回答) 
      ? row.回答[row.回答.length - 1]  // 複数ある場合は最後の値を使用
      : row.回答;

    // デバッグ用：生成されるドキュメントの確認
    const doc = new Document({
      pageContent: `質問: ${row.質問}\n回答: ${answer}`,
      metadata: {
        question: row.質問,
        answer: answer,
        tags: tags,
        priority: row.優先度,
        purpose: row.解決する課題
      }
    });
    console.log('Created document:', JSON.stringify(doc, null, 2));
    return doc;
  });
}

export async function getVectorStore(): Promise<VectorStore> {
  try {
    const collection = await ExtendedChroma.fromExistingCollection(
      embeddings,
      {
        collectionName: "park_and_ride",
        url: process.env.CHROMADB_URL
      }
    );
    return collection;
  } catch (error) {
    console.error('Error connecting to ChromaDB:', error);
    throw error;
  }
}
