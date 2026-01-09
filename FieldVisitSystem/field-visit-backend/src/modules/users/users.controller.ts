import { Router, Request, Response } from 'express';
import { prisma } from '../../database/database.service';
import bcrypt from 'bcryptjs';
import { Role } from '../../common/enums/role.enum';

const router = Router();

// SUPER ADMIN: View All Users with Activity
router.get('/all', async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            include: { organization: true },
            orderBy: { lastLoginAt: 'desc' } // Most active first
        });
        res.json(users);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ADMIN: Get Agents
router.get('/agents', async (req: Request, res: Response) => {
    try {
        const agents = await prisma.user.findMany({
            where: { role: Role.AGENT },
            select: {
                id: true,
                name: true,
                email: true,
                organizationId: true,
                isActive: true,
                lastLoginAt: true,
                lastKnownLocation: true
            }
        });
        res.json(agents);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET ONE USER
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            include: { organization: true }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        const { passwordHash, ...result } = user;
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// UPDATE LOCATION (For Agents)
router.patch('/location', async (req: Request, res: Response) => {
    try {
        const { latitude, longitude } = req.body;
        const id = (req as any).user?.userId; // Get ID from Token

        if (!id) throw new Error('Unauthorized');
        if (!latitude || !longitude) throw new Error('Coords required');

        await prisma.user.update({
            where: { id },
            data: {
                lastKnownLocation: JSON.stringify({ latitude, longitude, timestamp: new Date() })
            }
        });
        res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ... (Create, Suspend, Role endpoints remain same)
// CREATE USER
router.post('/', async (req: Request, res: Response) => {
    try {
        console.log('Create User Body:', req.body);
        const { email, password, name, role, organizationId } = req.body;

        // Check if user already exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'A user with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash: hashedPassword,
                name,
                role: role || Role.AGENT,
                organizationId
            }
        });
        const { passwordHash, ...result } = user;
        res.json(result);
    } catch (error: any) {
        console.error('Create User Error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.patch('/:id/suspend', async (req: Request, res: Response) => {
    try {
        const { isActive } = req.body;
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { isActive }
        });
        res.json(user);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.patch('/:id/role', async (req: Request, res: Response) => {
    try {
        const { role } = req.body;
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { role }
        });
        res.json(user);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// UPDATE USER (name, email, role)
router.patch('/:id', async (req: Request, res: Response) => {
    try {
        console.log('Updating user:', req.params.id, req.body);
        const { name, email, role, password } = req.body;

        // Check if email is being changed and if it's already taken
        if (email) {
            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing && existing.id !== req.params.id) {
                return res.status(400).json({ error: 'Email already in use by another user' });
            }
        }

        const updateData: any = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (role) updateData.role = role;
        if (password) {
            updateData.passwordHash = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: updateData
        });

        const { passwordHash, ...result } = user;
        res.json(result);
    } catch (error: any) {
        console.error('Update user error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        console.log('Deleting user with ID:', req.params.id);
        const deleted = await prisma.user.delete({ where: { id: req.params.id } });
        console.log('User deleted successfully:', deleted.email);
        res.json({ success: true });
    } catch (error: any) {
        console.error('Delete user error:', error);
        res.status(400).json({ error: error.message });
    }
});

export const UsersController = router;
