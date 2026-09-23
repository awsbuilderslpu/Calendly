import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/oauth";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
