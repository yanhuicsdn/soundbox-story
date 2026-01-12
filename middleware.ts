import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 如果访问根路径，重定向到 index.html
  if (pathname === '/') {
    return NextResponse.rewrite(new URL('/index.html', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/',
}
