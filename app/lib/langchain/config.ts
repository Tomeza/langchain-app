import { OpenAIEmbeddings } from '@langchain/openai';
import { ChatOpenAI } from '@langchain/openai';
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib';
import { Document } from '@langchain/core/documents';

// 環境変数の型チェック
if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API Key');
}

// OpenAI設定
export const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'text-embedding-ada-002',
  stripNewLines: true,
  batchSize: 512,
});

// LLMの設定
export const llm = new ChatOpenAI({
  modelName: 'gpt-3.5-turbo',
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
}); 