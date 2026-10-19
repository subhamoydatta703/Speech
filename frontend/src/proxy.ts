import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAuthConfigured } from "@/lib/auth-config";

const clerk = clerkMiddleware();
export default function proxy(...args: Parameters<typeof clerk>) {
  if (!isAuthConfigured()) return NextResponse.next();
  return clerk(...args);
}
export const config = { matcher: ["/((?!_next|.*\\..*).*)", "/api/(.*)"] };
