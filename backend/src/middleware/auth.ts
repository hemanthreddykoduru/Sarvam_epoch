import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { verifyAccessToken } from '../lib/jwtVerify.js';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    // Full signature + expiry verification against InsForge's JWKS (local, no round-trip).
    const payload = await verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch (error) {
    logger.error('Auth error', { error });
    return res.status(401).json({ error: 'Authentication failed' });
  }
};
