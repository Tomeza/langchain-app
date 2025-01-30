import * as dotenv from 'dotenv';
import path from 'path';
import { VectorStore } from "../lib/langchain/vectorstore";

// .env.localファイルを読み込む
dotenv.config({ path: '.env.local' });

// サンプルのナレッジデータ
const sampleKnowledge = [
  "商品の返品は購入後14日以内であれば可能です。",
  "送料は全国一律500円です。",
  "会員登録は無料です。",
  "お支払い方法はクレジットカード、銀行振込、代金引換に対応しています。"
];

async function setupChromaDB() {
  try {
    console.log("ChromaDBのセットアップを開始します...");
    await VectorStore.addDocuments(sampleKnowledge);
    console.log("ナレッジデータの登録が完了しました。");
  } catch (error) {
    console.error("セットアップ中にエラーが発生しました:", error);
  }
}

setupChromaDB(); 