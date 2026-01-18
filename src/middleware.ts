import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') ||
                     req.nextUrl.pathname.startsWith('/register')
  const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth')
  const isRegisterApi = req.nextUrl.pathname.startsWith('/api/register')

  // Allow auth API routes and register API
  if (isApiAuthRoute || isRegisterApi) {
    return NextResponse.next()
  }

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Redirect non-logged-in users to login
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)']
}
