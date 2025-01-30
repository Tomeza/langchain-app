# LangChain Vectorstore Implementation

ChromaDBを使用したLangChainベースの質問応答システム

## 機能

- ChromaDBによるベクトル検索
- CSVからの知識ベースのインポート
- 関連質問の提案
- Next.js + TypeScriptによるWeb UI

## セットアップ

1. 環境変数の設定:
```bash
# .env.localファイルをプロジェクトのルートに作成
OPENAI_API_KEY=your-api-key-here
```

2. 依存関係のインストール:
```bash
npm install
```

3. 開発サーバーの起動:
```bash
npm run dev
```

## 使用技術

- LangChain
- ChromaDB
- Next.js
- TypeScript
- OpenAI

## テスト

```bash
npm run test:vectorstore
```