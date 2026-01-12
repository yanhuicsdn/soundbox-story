import { redirect } from 'next/navigation'

export default function Home() {
  // 重定向到静态 index.html
  redirect('/index.html')
}
