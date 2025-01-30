import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';

// 環境変数のバリデーション
const validateEnvVars = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
};

// OpenAI Embeddings の設定
export function getEmbeddings() {
  validateEnvVars();
  
  return new OpenAIEmbeddings({
    modelName: 'text-embedding-ada-002',
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
} 