import { auth } from "~/server/auth";

export default auth((req) => {
  const token = req.auth;
  const { pathname } = req.nextUrl;

  // Allow access to auth pages without token
  if (pathname.startsWith("/auth/")) {
    return;
  }

  // Allow access to challenge pages (for candidates)
  if (pathname.startsWith("/challenge/")) {
    return;
  }

  // Allow access to invitation pages
  if (pathname.startsWith("/invitation/")) {
    return;
  }

  // Allow access to home page
  if (pathname === "/") {
    return;
  }

  // For all other routes, require authentication with organization
  if (!token || !token.user?.organizationId) {
    return Response.redirect(new URL("/auth/signin", req.url));
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
