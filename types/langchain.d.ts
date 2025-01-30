declare module '@langchain/core/documents' {
  export class Document {
    pageContent: string;
    metadata?: Record<string, any>;
    constructor(fields: { pageContent: string; metadata?: Record<string, any> });
  }
}

declare module '@langchain/core/embeddings' {
  export interface Embeddings {
    embedQuery(text: string): Promise<number[]>;
    embedDocuments(documents: string[]): Promise<number[][]>;
  }
}

declare module '@langchain/core/vectorstores' {
  import { Document } from '@langchain/core/documents';
  
  export interface VectorStoreRetriever {
    getRelevantDocuments(query: string): Promise<Document[]>;
  }
}

declare module 'langchain/chains' {
  import { BaseLanguageModel } from '@langchain/core/language_models/base';
  import { VectorStoreRetriever } from '@langchain/core/vectorstores';

  export class RetrievalQAChain {
    static fromLLM(
      llm: BaseLanguageModel,
      retriever: VectorStoreRetriever
    ): RetrievalQAChain;
    call(params: { query: string }): Promise<{ text: string; sourceDocuments: any[] }>;
  }
}

declare module 'langchain/vectorstores/memory' {
  import { Embeddings } from '@langchain/core/embeddings';
  import { Document } from '@langchain/core/documents';
  import { VectorStoreRetriever } from '@langchain/core/vectorstores';

  export class MemoryVectorStore {
    constructor(embeddings: Embeddings);
    addDocuments(documents: Document[]): Promise<void>;
    similaritySearch(query: string, k?: number): Promise<Document[]>;
    asRetriever(): VectorStoreRetriever;
  }
}

declare module '@langchain/core/language_models/base' {
  export class BaseLanguageModel {
    invoke(messages: Array<{
      content: string;
      role: string;
    }>): Promise<{
      content: string;
    }>;
  }
}

declare module '@langchain/core/messages' {
  export class BaseMessage {
    content: string;
    role: string;
  }

  export class SystemMessage extends BaseMessage {
    constructor(content: string);
  }

  export class HumanMessage extends BaseMessage {
    constructor(content: string);
  }
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ pageContent: string }>;
  relatedQuestions?: string[];  // 型定義は正しい
} 