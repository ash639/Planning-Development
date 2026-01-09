import { Request, Response, NextFunction } from 'express';

export const AuthGuard = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  next();
};
