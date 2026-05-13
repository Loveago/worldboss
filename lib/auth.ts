import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import type { User, Role } from "@prisma/client";

const TOKEN_NAME = "token";
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const TOKEN_TTL_SECONDS = 60 * 60 * 24; // 1 day

export type AuthTokenPayload = { id: string; role: Role; email: string };

export function signToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch (err) {
    return null;
  }
}

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function setAuthCookie(token: string) {
  cookies().set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });
}

export function clearAuthCookie() {
  cookies().delete(TOKEN_NAME);
}

export async function getUserFromRequest(req: NextRequest): Promise<{ user: User | null; payload: AuthTokenPayload | null }> {
  const token = req.cookies.get(TOKEN_NAME)?.value;
  if (!token) return { user: null, payload: null };
  const payload = verifyToken(token);
  if (!payload) return { user: null, payload: null };
  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  return { user, payload };
}
