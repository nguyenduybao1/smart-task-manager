import supertest from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';

export const request = supertest(app);

export interface TestUser {
  id:          string;
  email:       string;
  accessToken: string;
}

export async function createTestUser(
  email    = 'test@example.com',
  password = 'password123',
  name     = 'Test User',
): Promise<TestUser> {
  // Cleanup trước để tránh conflict
  await prisma.refreshToken.deleteMany({
    where: { user: { email } }
  });
  await prisma.task.deleteMany({
    where: { user: { email } }
  });
  await prisma.user.deleteMany({ where: { email } });

  const res = await request
    .post('/api/auth/register')
    .send({ email, password, name });

  const user = await prisma.user.findUnique({ where: { email } });

  return {
    id:          user!.id,
    email,
    accessToken: res.body.data.accessToken,
  };
}

export async function cleanupUser(email: string) {
  await prisma.refreshToken.deleteMany({
    where: { user: { email } }
  });
  await prisma.task.deleteMany({
    where: { user: { email } }
  });
  await prisma.user.deleteMany({ where: { email } });
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}