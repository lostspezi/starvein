import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // /api bleibt vom Locale-Routing ausgenommen (z. B. /api/health)
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
