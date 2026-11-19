import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthTokenPayload } from '../types/auth.types';

export function generateToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn']
  });
}

export function verifyToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);

  if (typeof decoded === 'string') {
    throw new Error('Invalid authentication token');
  }

  return decoded as AuthTokenPayload;
}
