import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { prisma } from "../config/db";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req);
    const userId = auth.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Missing authentication credentials",
      });
    }

    // 1. Fast path: User already exists in local DB (takes 1ms)
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // 2. First-time sync: User doesn't exist in local DB yet
    if (!user) {
      try {
        // Read the email directly from the JWT session claims (zero network latency!)
        const email = (auth.sessionClaims as any)?.email as string | undefined;

        if (!email) {
          return res.status(400).json({
            success: false,
            message: "No email address found in session token. Please ensure session token claims are configured in Clerk.",
          });
        }

        // Upsert into local PostgreSQL
        user = await prisma.user.upsert({
          where: { id: userId },
          create: { id: userId, email },
          update: { email },
        });
      } catch (syncErr: any) {
        // If parallel requests raced to insert, fetch the user created by the winning request
        user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          console.error("Failed to sync user:", syncErr);
          return res.status(500).json({
            success: false,
            message: "Failed to initialize user profile",
          });
        }
      }
    }

    req.userId = userId;
    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error in authentication",
    });
  }
}
