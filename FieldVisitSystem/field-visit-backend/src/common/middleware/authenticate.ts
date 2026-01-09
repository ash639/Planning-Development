import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Env } from '../../config/env.config';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, Env.JWT_SECRET);
        (req as any).user = decoded;
        console.log('Token verified for user:', (decoded as any).userId);
        next();
    } catch (err) {
        console.error('Token verification failed:', (err as any).message);
        return res.status(401).json({ error: 'Invalid token' });
    }
};
