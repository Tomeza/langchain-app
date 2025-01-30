import './globals.css'

export const metadata = {
  title: 'LangChain Chat',
  description: 'Chat with LangChain',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50">{children}</body>
    </html>
  )
}
