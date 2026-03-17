import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as authService from '@/services/auth.service';
import { ValidationError } from '@/utils/errors';

const REFRESH_COOKIE = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg as string);
    }

    const { email, password, name } = req.body;
    const tokens = await authService.register({ email, password, name });

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);

    return res.status(201).json({
      success: true,
      data: { accessToken: tokens.accessToken },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg as string);
    }

    const { email, password } = req.body;
    const tokens = await authService.login({ email, password });

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      data: { accessToken: tokens.accessToken },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE];
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No refresh token provided' },
      });
    }

    const tokens = await authService.refresh(refreshToken);

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      data: { accessToken: tokens.accessToken },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE];
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.clearCookie(REFRESH_COOKIE);

    return res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (err) {
    next(err);
  }
}

export async function logoutAll(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.logoutAll(req.userId);

    res.clearCookie(REFRESH_COOKIE);

    return res.status(200).json({
      success: true,
      data: { message: 'Logged out from all devices' },
    });
  } catch (err) {
    next(err);
  }
}