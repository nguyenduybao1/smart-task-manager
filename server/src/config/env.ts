import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string) : string{
    const value = process.env[key];
    if(!value){
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

export const config = {
    env: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),

    db: {
        url: requireEnv('DATABASE_URL'),
    },

    jwt: {
        accessSecret: requireEnv('JWT_ACCESS_SECRET'),
        refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    },

    cookie: {
        secret: requireEnv('COOKIE_SECRET'),
    },

    cors: {
        origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    },
} as const;