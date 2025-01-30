import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { VectorStoreRetriever } from "@langchain/core/vectorstores";
import { getEmbeddings } from "./config";

// ChromaDBのコレクション名
const COLLECTION_NAME = "knowledge_base";

export class VectorStore {
  private static instance: MemoryVectorStore | null = null;

  private static readonly INITIAL_DATA = [
    "LangChainは、大規模言語モデル（LLM）を使用したアプリケーションを開発するためのフレームワークです。",
    "LangChainは、プロンプトの管理、LLMの連鎖、外部ツールとの統合などの機能を提供します。",
    "Next.jsは、Reactベースのフルスタックフレームワークで、サーバーサイドレンダリングやAPIルートなどの機能を提供します。",
    "OpenAIのGPT-3.5は、自然言語処理タスクで高い性能を発揮する言語モデルです。",
    "ベクトルストアは、テキストをベクトル化して保存し、類似度検索を可能にするデータベースです。",
    "MemoryVectorStoreは、メモリ上でベクトルを保持する簡易的なベクトルストアの実装です。"
  ];

  static async getInstance(): Promise<MemoryVectorStore> {
    if (!this.instance) {
      const embeddings = getEmbeddings();
      try {
        this.instance = new MemoryVectorStore(embeddings);
        // 初期データを追加
        const documents = this.INITIAL_DATA.map(
          text => new Document({ pageContent: text, metadata: { source: "init" } })
        );
        await this.instance.addDocuments(documents);
        console.log(`Initialized with ${documents.length} documents`);
      } catch (error) {
        console.error("Error initializing MemoryVectorStore:", error);
        throw error;
      }
    }
    return this.instance;
  }

  // デバッグ用のメソッドを追加
  static async getAllDocuments(): Promise<Document[]> {
    const vectorStore = await this.getInstance();
    return await vectorStore.similaritySearch("", 100); // すべてのドキュメントを取得
  }

  static async addDocuments(texts: string[]): Promise<void> {
    const documents = texts.map(
      (text) => new Document({ pageContent: text })
    );
    const vectorStore = await this.getInstance();
    await vectorStore.addDocuments(documents);
    console.log(`Added ${texts.length} documents to vector store`);
  }

  static async similaritySearch(query: string, k: number = 4): Promise<Document[]> {
    const vectorStore = await this.getInstance();
    const results = await vectorStore.similaritySearch(query, k);
    console.log('Query:', query);
    console.log('Search results:', results);
    return results;
  }

  static async asRetriever(options = {}): Promise<VectorStoreRetriever> {
    const vectorStore = await this.getInstance();
    return vectorStore.asRetriever({
      verbose: true,
      returnSourceDocuments: true,
      ...options
    });
  }
}