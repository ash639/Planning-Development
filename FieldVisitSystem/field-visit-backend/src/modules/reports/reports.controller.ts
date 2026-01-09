
import { Router, Request, Response } from 'express';
import { prisma } from '../../database/database.service';

const router = Router();

// GET ALL (Super Admin)
router.get('/', async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.query;
        const whereClause = organizationId ? { organizationId: String(organizationId) } : {};

        const reports = await prisma.report.findMany({
            where: whereClause,
            include: {
                author: { select: { name: true, role: true, email: true } },
                organization: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reports);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// SUBMIT REPORT (Agent/Admin)
router.post('/', async (req: Request, res: Response) => {
    try {
        const { title, content, type, organizationId } = req.body;
        // Ideally get userId from token, but for now we'll assume it's passed or extracted
        // We'll trust the body for simplicity if middleware isn't fully stripping it, 
        // OR we use the auth middleware's user attached to req.

        const userId = (req as any).user?.userId;

        if (!userId || !organizationId) {
            return res.status(400).json({ error: 'User ID and Organization ID required' });
        }

        const report = await prisma.report.create({
            data: {
                title,
                content,
                type: type || 'GENERAL',
                authorId: userId,
                organizationId
            }
        });
        res.json(report);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// GET REPORTS BY ORG
router.get('/org/:orgId', async (req: Request, res: Response) => {
    try {
        const reports = await prisma.report.findMany({
            where: { organizationId: req.params.orgId },
            include: { author: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reports);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export const ReportsController = router;
