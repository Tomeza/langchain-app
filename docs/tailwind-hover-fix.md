# Tailwindホバー効果の実装記録

## 問題
関連質問ボタンのホバー効果が機能しない問題が発生。Safari/Chrome両方で同様の症状。

## 環境
```json
{
  "devDependencies": {
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.31",
    "tailwindcss": "^3.3.0"
  }
}
```

## 解決までの過程

### 1. 初期状態での問題
- ホバー効果が機能しない
- ブラウザ間で挙動が異なる
- スタイルの適用が不安定

### 2. 試行錯誤
1. vanilla-extractアプローチ（失敗）
   - 複雑化するため中止
   - プロジェクトの規模に対して過剰な対応

2. Tailwind設定の見直し
   - `safelist`パターンの問題
   - `content`パスの不適切な設定

3. 根本的な問題発見
   ```css
   @layer base {
     button {
       all: unset;
       cursor: pointer;
     }
   }
   ```
   - ボタンのリセットスタイルがTailwindと競合

### 3. 最終的な解決策

#### `tailwind.config.js`
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: 'jit',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

#### `globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### `RelatedQuestionButton.tsx`
```typescript
interface RelatedQuestionButtonProps {
  question: string;
  onClick: (question: string) => void;
}

export function RelatedQuestionButton({ question, onClick }: RelatedQuestionButtonProps) {
  return (
    <button
      onClick={() => onClick(question)}
      className="w-full p-2 text-left text-sm 
        bg-white rounded-lg shadow-sm
        text-gray-900
        hover:bg-gray-50 hover:shadow hover:text-blue-600
        active:bg-gray-100
        transition-all duration-200
        border border-gray-200"
    >
      {question}
    </button>
  );
}
```

## デバッグに有用だったコマンド
```bash
# Tailwindのクラス生成確認
npx tailwindcss -o output.css --content "./app/**/*.{js,ts,jsx,tsx,mdx}" --minify

# キャッシュクリア
rm -rf .next/
rm -rf node_modules/.cache
```

## 学んだこと
1. **スタイルの競合に注意**
   - `@layer base`でのリセットは慎重に
   - コンポーネント単位でスタイルを管理

2. **Tailwindの設定**
   - JITモードの重要性
   - 適切な`content`パスの設定
   - 不要な`safelist`は削除

3. **コンポーネント設計**
   - 独立したコンポーネントとしての実装
   - スタイルの集約
   - 再利用性の確保

## 結果
- Safari/Chrome両方で一貫した表示
- スムーズなホバー効果
- メンテナンス性の向上

## 参考
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Next.js with Tailwind CSS](https://nextjs.org/docs/app/building-your-application/styling/tailwind-css) 