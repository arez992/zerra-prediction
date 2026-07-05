import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
const locales = ["en","fr","es","ar"];
export function middleware(request: NextRequest){const {pathname}=request.nextUrl;const ok=locales.some(l=>pathname.startsWith(`/${l}/`)||pathname===`/${l}`);if(ok)return;request.nextUrl.pathname=`/en${pathname}`;return NextResponse.redirect(request.nextUrl)}
export const config={matcher:["/((?!_next|api|.*\\..*).*)"]};
