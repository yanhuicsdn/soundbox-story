'use client'

import { useEffect } from 'react'

export default function Home() {
  useEffect(() => {
    // 客户端重定向到静态 index.html
    window.location.href = '/index.html'
  }, [])

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'sans-serif'
    }}>
      <p>正在跳转...</p>
    </div>
  )
}
