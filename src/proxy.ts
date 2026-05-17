import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const auth = request.cookies.get('auth')
  const isPublicPage = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup'

  if (!auth && !isPublicPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  if (auth && isPublicPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
