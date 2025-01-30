declare module '@langchain/openai' {
  import { SystemMessage, HumanMessage } from '@langchain/core/messages';

  export class ChatOpenAI {
    constructor(config: {
      modelName?: string;
      temperature?: number;
      openAIApiKey?: string;
    });

    invoke(messages: Array<SystemMessage | HumanMessage>): Promise<{
      content: string;
    }>;

    call(messages: Array<SystemMessage | HumanMessage>): Promise<{
      text: string;
    }>;

    generate(messagesList: Array<Array<SystemMessage | HumanMessage>>): Promise<{
      generations: Array<Array<{ text: string }>>;
    }>;
  }

  export class OpenAIEmbeddings {
    constructor(config: {
      modelName?: string;
      openAIApiKey?: string;
    });
    
    embedQuery(text: string): Promise<number[]>;
    embedDocuments(documents: string[]): Promise<number[][]>;
  }
}

declare module '@langchain/core/language_models/base' {
  export class BaseLanguageModel {
    constructor();
  }
}

declare module '@langchain/core/vectorstores' {
  import { Document } from '@langchain/core/documents';
  
  export interface VectorStore {
    similaritySearch(query: string, k?: number): Promise<Document[]>;
    asRetriever(): {
      getRelevantDocuments(query: string): Promise<Document[]>;
    };
  }
}

declare module 'langchain/chains' {
  import { BaseLanguageModel } from '@langchain/core/language_models/base';
  import { VectorStore } from '@langchain/core/vectorstores';

  export class RetrievalQAChain {
    static fromLLM(
      llm: BaseLanguageModel,
      retriever: ReturnType<VectorStore['asRetriever']>
    ): RetrievalQAChain;

    call(params: { query: string }): Promise<{ text: string; sourceDocuments: any[] }>;
  }
} 