import { NextResponse, type NextRequest } from 'next/server';

// Eingefroren: Nur die Startseite ist öffentlich erreichbar. Alle anderen
// Seiten leiten auf "/" um. API-Routen (u. a. der EOD-Cron) sind vom
// Matcher ausgenommen und laufen weiter.
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes - handled separately)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
