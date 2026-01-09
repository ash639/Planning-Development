import { Router, Request, Response } from 'express';
import { OrganizationsService } from './organizations.service';
import { prisma } from '../../database/database.service';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
    try {
        const org = await OrganizationsService.create(req.body);
        res.json(org);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.patch('/:id', async (req: Request, res: Response) => {
    try {
        const org = await OrganizationsService.update(req.params.id, req.body);
        res.json(org);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.get('/', async (req: Request, res: Response) => {
    try {
        const orgs = await OrganizationsService.findAll();
        res.json(orgs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', async (req: Request, res: Response) => {
    try {
        const org = await OrganizationsService.findOne(req.params.id);
        if (!org) return res.status(404).json({ error: 'Not Found' });
        res.json(org);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:id/status', async (req: Request, res: Response) => {
    try {
        const org = await OrganizationsService.updateStatus(req.params.id, req.body.status);
        res.json(org);
    } catch (error: any) { res.status(400).json({ error: error.message }); }
});

router.patch('/:id/plan', async (req: Request, res: Response) => {
    try {
        const org = await OrganizationsService.updatePlan(req.params.id, req.body.plan);
        res.json(org);
    } catch (error: any) { res.status(400).json({ error: error.message }); }
});

router.patch('/:id/settings', async (req: Request, res: Response) => {
    try {
        const org = await OrganizationsService.updateSettings(req.params.id, req.body);
        res.json(org);
    } catch (error: any) { res.status(400).json({ error: error.message }); }
});

router.get('/:id/admins', async (req: Request, res: Response) => {
    try {
        const admins = await prisma.user.findMany({
            where: { organizationId: req.params.id, role: 'ADMIN' }
        });
        res.json(admins);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.get('/:id/users', async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            where: { organizationId: req.params.id },
            select: {
                id: true, name: true, email: true, role: true,
                isActive: true, lastLoginAt: true, lastKnownLocation: true
            }
        });
        res.json(users);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        await OrganizationsService.delete(req.params.id);
        res.json({ message: 'Organization deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export const OrganizationsController = router;
