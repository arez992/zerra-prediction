import { NextRequest } from "next/server";

export function isAdminRequest(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;

  if (!secret) {
    console.error("ADMIN_SECRET is not configured.");
    return false;
  }

  const headerSecret = request.headers.get("x-admin-secret");

  return headerSecret === secret;
}

export function unauthorizedResponse() {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Unauthorized",
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}