import jwt from 'jsonwebtoken';
import { config } from '@/config/env';
import { UnauthorizedError } from './errors';

export interface AccessTokenPayload {
    userId: string;
    email: string;
}

export interface RefreshTokenPayload {
    userId: string;
    tokenId: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, config.jwt.accessSecret, {
        expiresIn: config.jwt.accessExpiresIn,
    } as jwt.SignOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiresIn,
    } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
    try {
        return jwt.verify(token, config.jwt.accessSecret) as AccessTokenPayload;
    } catch {
        throw new UnauthorizedError('Invalid or expired access token');
    }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
        return jwt.verify(token, config.jwt.refreshSecret) as RefreshTokenPayload;
    } catch {
        throw new UnauthorizedError('Invalid or expired refresh token');
    }
}