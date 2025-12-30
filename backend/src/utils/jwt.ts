/**
 * ===============================================
 * JWT UTILITIES - CENTRALIZED TOKEN MANAGEMENT
 * ===============================================
 * Single source of truth for all JWT operations.
 * Supports access tokens, refresh tokens, and token versioning.
 */

import jwt, { SignOptions, Secret } from "jsonwebtoken";

// Environment variables
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET!;

// Token TTLs - configurable via env (cast to any for SignOptions compatibility)
const ACCESS_TOKEN_TTL: any = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_TTL: any = process.env.REFRESH_TOKEN_TTL || "7d";

/**
 * Token payload interface
 */
export interface TokenPayload {
  sub: string;           // User ID
  role: string;          // Role name
  permissions: string[]; // Permission strings
  tokenVersion: number;  // For token invalidation
  type?: "access" | "refresh";
}

/**
 * Sign an access token (short-lived, 15 min default)
 */
export function signAccessToken(payload: Omit<TokenPayload, "type">): string {
  if (!ACCESS_TOKEN_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  const tokenPayload: TokenPayload = {
    ...payload,
    type: "access",
  };

  const options: SignOptions = {
    expiresIn: ACCESS_TOKEN_TTL,
  };

  return jwt.sign(tokenPayload, ACCESS_TOKEN_SECRET, options);
}

/**
 * Sign a refresh token (long-lived, 7 days default)
 */
export function signRefreshToken(payload: Pick<TokenPayload, "sub" | "tokenVersion">): string {
  if (!REFRESH_TOKEN_SECRET) {
    throw new Error("REFRESH_TOKEN_SECRET is not defined in environment variables");
  }

  const tokenPayload = {
    sub: payload.sub,
    tokenVersion: payload.tokenVersion,
    type: "refresh",
  };

  const options: SignOptions = {
    expiresIn: REFRESH_TOKEN_TTL,
  };

  return jwt.sign(tokenPayload, REFRESH_TOKEN_SECRET, options);
}

/**
 * Verify and decode an access token
 */
export function verifyAccessToken(token: string): TokenPayload {
  if (!ACCESS_TOKEN_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
}

/**
 * Verify and decode a refresh token
 */
export function verifyRefreshToken(token: string): { sub: string; tokenVersion: number } {
  if (!REFRESH_TOKEN_SECRET) {
    throw new Error("REFRESH_TOKEN_SECRET is not defined in environment variables");
  }

  return jwt.verify(token, REFRESH_TOKEN_SECRET) as { sub: string; tokenVersion: number };
}

/**
 * Cookie options for refresh token (HttpOnly, Secure in production)
 */
export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

/**
 * Get refresh token TTL in milliseconds
 */
export function getRefreshTokenTTLMs(): number {
  const ttl = REFRESH_TOKEN_TTL;
  const match = ttl.match(/^(\d+)([dhms])$/);
  
  if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case "d": return value * 24 * 60 * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "m": return value * 60 * 1000;
    case "s": return value * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}
