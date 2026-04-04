import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/utils/jwt';
import { ConflictError, UnauthorizedError } from '@/utils/errors';
import { config } from '@/config/env';

const SALT_ROUNDS = 12;

export interface RegisterInput {
  email:    string;
  password: string;
  name:     string;
}

export interface LoginInput {
  email:    string;
  password: string;
}

export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
}

async function _generateTokens(userId: string, email: string): Promise<AuthTokens> {
  const tokenId = uuidv4();

  const accessToken  = signAccessToken({ userId, email });
  const refreshToken = signRefreshToken({ userId, tokenId });

  const days = parseInt(config.jwt.refreshExpiresIn.replace('d', ''), 10);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId, expiresAt },
  });

  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput): Promise<AuthTokens> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new ConflictError('Email is already registered');
  }

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email:    input.email,
      password: hashedPassword,
      name:     input.name,
    },
  });

  return _generateTokens(user.id, user.email);
}

export async function login(input: LoginInput): Promise<AuthTokens> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  // Constant-time comparison to prevent timing attacks
  const passwordMatch = user
    ? await bcrypt.compare(input.password, user.password)
    : await bcrypt.compare(input.password, '$2b$12$invalidhashfortimingprotection');

  if (!user || !passwordMatch) {
    throw new UnauthorizedError('Invalid email or password');
  }

  return _generateTokens(user.id, user.email);
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  verifyRefreshToken(refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token is invalid or expired');
  }

  await prisma.refreshToken.delete({ where: { id: storedToken.id } });

  return _generateTokens(storedToken.user.id, storedToken.user.email);
}

export async function logout(refreshToken: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}

export async function logoutAll(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}