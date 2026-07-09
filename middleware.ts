import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const locales = ["en", "fr", "es", "ar"];

function hasLocale(pathname: string) {
  return locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
}

function isAllowedDuringMaintenance(pathname: string) {
  return (
    pathname.startsWith("/api") ||
    pathname.includes("/admin") ||
    pathname.includes("/login") ||
    pathname.includes("/register") ||
    pathname.includes("/maintenance")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!hasLocale(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/en${pathname}`;
    return NextResponse.redirect(url);
  }

  const maintenanceMode =
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  if (maintenanceMode && !isAllowedDuringMaintenance(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/en/maintenance";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const locales = ["en", "fr", "es", "ar"];

function hasLocale(pathname: string) {
  return locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
}

function isAllowedDuringMaintenance(pathname: string) {
  return (
    pathname.startsWith("/api") ||
    pathname.includes("/admin") ||
    pathname.includes("/login") ||
    pathname.includes("/register") ||
    pathname.includes("/maintenance")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!hasLocale(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/en${pathname}`;
    return NextResponse.redirect(url);
  }

  const maintenanceMode =
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  if (maintenanceMode && !isAllowedDuringMaintenance(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/en/maintenance";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};