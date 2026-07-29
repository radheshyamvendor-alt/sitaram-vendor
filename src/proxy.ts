import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_CONSTANTS } from "@/services/auth.constants";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Retrieve the refresh token cookie
  const refreshToken = request.cookies.get(AUTH_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN)?.value;

  const isProtectedRoute =
    pathname.startsWith(AUTH_CONSTANTS.ROUTES.DASHBOARD) ||
    pathname.startsWith(AUTH_CONSTANTS.ROUTES.PROFILE);

  const isAuthRoute =
    pathname.startsWith(AUTH_CONSTANTS.ROUTES.LOGIN) ||
    pathname.startsWith(AUTH_CONSTANTS.ROUTES.REGISTER) ||
    pathname.startsWith(AUTH_CONSTANTS.ROUTES.FORGOT_PASSWORD) ||
    pathname.startsWith(AUTH_CONSTANTS.ROUTES.RESET_PASSWORD);

  // If trying to access a protected route and not logged in, redirect to login
  if (isProtectedRoute && !refreshToken) {
    const loginUrl = new URL(AUTH_CONSTANTS.ROUTES.LOGIN, request.url);
    // Remember original intent
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If already authenticated and trying to access login/register, redirect to dashboard orders
  if (isAuthRoute && refreshToken) {
    const dashboardUrl = new URL("/dashboard/otp", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

// Limit the proxy to run only on relevant routes
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
