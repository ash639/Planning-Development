import { Router, Request, Response } from 'express';
import { AuthService } from './auth.service';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const user = await AuthService.register(req.body);
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const result = await AuthService.login(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

import { authenticate } from '../../common/middleware/authenticate';

router.post('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) throw new Error('Both passwords required');

    console.log('Change password request for user:', userId);
    await AuthService.changePassword(userId, oldPassword, newPassword);
    console.log('Password updated successfully for user:', userId);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (e: any) {
    console.error('Password change error:', e.message);
    res.status(400).json({ error: e.message });
  }
});

export const AuthController = router;
