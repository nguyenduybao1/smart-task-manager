import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "@/utils/jwt";
import { UnauthorizedError } from "@/utils/errors";

// Extend Express Request to include userId
declare global {
    namespace Express {
        interface Request {
            userId: string;
            userEmail: string;
        }
    }
}

export function authenticate(req: Request, _res: Response, next: NextFunction){
    const authHeader = req.headers.authorization;

    if(!authHeader?.startsWith('Bearer ')){
        return next(new UnauthorizedError('Missing or invalid Authorization header'));
    }

    const token = authHeader.slice(7);

    try {
        const payload = verifyAccessToken(token);
        req.userId = payload.userId;
        req.userEmail = payload.email;
        next();
    } catch (err) {
        next(err);
    }
}