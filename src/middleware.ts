import { NextResponse, type NextRequest } from "next/server";

// The App Router streams its RSC payload through inline <script> tags whose
// bytes embed the request URL, so their hashes differ per request and cannot be
// generated at build time. A per-request nonce is the equivalent: Next reads the
// policy off the request headers and stamps the nonce onto every script tag it
// emits, so nothing here is ever written by hand.
function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Hashes cover <style> elements but not inline style attributes, and no
    // source expression does, so 'unsafe-inline' has to stay here.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    // The browser-side probe fetches arbitrary user-supplied origins — that is
    // the product. Narrowing this to 'self' makes every probe throw TypeError,
    // which browser-probe.ts reads as "failed_signal", i.e. the tool would
    // report every domain as blocked. 'https:' keeps http:, ws: and data: out.
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

export function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const policy = contentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
