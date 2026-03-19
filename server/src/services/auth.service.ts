import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../db/prisma.js";
import type { UserPublic, JwtPayload } from "../types/auth.js";
import type { User } from "../generated/prisma/client.js";

const SALT_ROUNDS = 12;

function stripPassword(user: User): UserPublic {
  return {
    id: user.id,
    email: user.email,
    googleId: user.googleId,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    themePreference: user.themePreference,
    createdAt: user.createdAt,
  };
}

function buildAuthResult(user: User) {
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  return {
    user: stripPassword(user),
    accessToken,
    refreshToken,
  };
}

function generateAccessToken(userId: string): string {
  return jwt.sign({ userId } satisfies JwtPayload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || "15m") as jwt.SignOptions["expiresIn"],
  });
}

function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId } satisfies JwtPayload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || "7d") as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JwtPayload;
}

export async function registerUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string
) {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    throw new Error("Email already registered");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { email, passwordHash, firstName, lastName },
  });

  return buildAuthResult(user);
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) {
    throw new Error("Invalid email or password");
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch) {
    throw new Error("Invalid email or password");
  }

  return buildAuthResult(user);
}

export async function loginWithGoogle(params: {
  email: string;
  googleId: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}) {
  const email = params.email.toLowerCase().trim();
  const googleId = params.googleId.trim();

  let user = await prisma.user.findUnique({
    where: { googleId },
  });

  if (!user) {
    user = await prisma.user.findUnique({
      where: { email },
    });
  }

  const userData = {
    email,
    googleId,
    firstName: params.firstName.trim(),
    lastName: params.lastName.trim(),
    avatarUrl: params.avatarUrl ?? null,
  };

  let isNewUser = false;

  if (!user) {
    user = await prisma.user.create({
      data: userData,
    });
    isNewUser = true;
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId,
        firstName: user.firstName || userData.firstName,
        lastName: user.lastName || userData.lastName,
        avatarUrl: user.avatarUrl ?? userData.avatarUrl,
      },
    });
  }

  return {
    ...buildAuthResult(user),
    isNewUser,
  };
}

export async function refreshTokens(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return buildAuthResult(user);
}

export async function getUserById(userId: string): Promise<UserPublic | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return null;

  return stripPassword(user);
}
