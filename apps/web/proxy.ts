import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./src/i18n/routing";

const intlProxy = createMiddleware(routing);

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Fix CVE-2026-44573 — bloquer les routes /_next/data sans préfixe de locale
  const dataRouteWithoutLocale = /^\/_next\/data\/[^/]+\/(?!(fr|en|de)\/)/;
  if (dataRouteWithoutLocale.test(pathname)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return intlProxy(req);
}

export const config = {
  matcher: [
    // Intercepter les routes _next/data (fix CVE)
    "/_next/data/:path*",
    // Pages normales
    "/",
    "/(fr|en|de)/:path*",
    // Exclure les fichiers statiques, routes API et assets Next.js
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html|xml|txt|mjs)$).*)",
  ],
};
