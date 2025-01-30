declare module '@langchain/community/vectorstores/hnswlib' {
  import { Embeddings } from '@langchain/core/embeddings';
  import { Document } from '@langchain/core/documents';

  export class HNSWLib {
    constructor(embeddings: Embeddings);
    static fromTexts(
      texts: string[],
      metadatas: object[],
      embeddings: Embeddings
    ): Promise<HNSWLib>;
    addDocuments(documents: Document[]): Promise<void>;
    similaritySearch(query: string, k?: number): Promise<Document[]>;
    asRetriever(): {
      getRelevantDocuments(query: string): Promise<Document[]>;
    };
  }
} 