import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Preserve host from incoming request for proper redirects on Netlify
  const url = new URL('/en/documentation', request.url)
  return NextResponse.redirect(url)
}