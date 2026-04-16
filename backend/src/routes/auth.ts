import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../validators/schemas';
import { signToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.post(
  '/register',
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, name } = req.body as { email: string; password: string; name: string };

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw new AppError(409, 'Email already registered', 'EMAIL_TAKEN');
      }

      const hashed = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, password: hashed, name },
        select: { id: true, email: true, name: true, createdAt: true },
      });

      const token = signToken({ id: user.id, email: user.email });

      res.status(201).json({ success: true, data: { user, token } });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body as { email: string; password: string };

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
      }

      const token = signToken({ id: user.id, email: user.email });

      res.json({
        success: true,
        data: {
          user: { id: user.id, email: user.email, name: user.name },
          token,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
