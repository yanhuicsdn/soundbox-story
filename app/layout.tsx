export const metadata = {
  title: '声宝盒 - 定制语音故事',
  description: '为孩子定制专属的语音故事',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
