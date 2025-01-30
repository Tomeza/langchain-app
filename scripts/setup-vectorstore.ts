const dotenv = require('dotenv');
const path = require('path');
const { VectorStore } = require('../lib/langchain/vectorstore');

// 環境変数の読み込み
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const sampleData = [
  "LangChainは、大規模言語モデル（LLM）を使用したアプリケーションを開発するためのフレームワークです。",
  "LangChainは、プロンプトの管理、LLMの連鎖、外部ツールとの統合などの機能を提供します。",
  "Next.jsは、Reactベースのフルスタックフレームワークで、サーバーサイドレンダリングやAPIルートなどの機能を提供します。",
  "OpenAIのGPT-3.5は、自然言語処理タスクで高い性能を発揮する言語モデルです。",
  "ベクトルストアは、テキストをベクトル化して保存し、類似度検索を可能にするデータベースです。",
  "MemoryVectorStoreは、メモリ上でベクトルを保持する簡易的なベクトルストアの実装です。"
];

async function main() {
  try {
    await VectorStore.addDocuments(sampleData);
    console.log('Sample data has been added to the vector store.');
  } catch (error) {
    console.error('Error adding sample data:', error);
    process.exit(1);
  }
}

main(); 