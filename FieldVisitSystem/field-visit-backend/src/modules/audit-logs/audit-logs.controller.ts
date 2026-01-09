import { Router, Request, Response } from 'express';
import { LoggerService } from '../../modules/logger/logger.service';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const filters: any = {};
        if (req.query.organizationId) {
            filters.organizationId = String(req.query.organizationId);
        }

        const logs = await LoggerService.getLogs(filters);

        // Map to frontend friendly format
        const formatted = logs.map(l => ({
            id: l.id,
            action: l.action,
            user: l.user?.email || 'System',
            timestamp: l.createdAt,
            details: l.details
        }));

        res.json(formatted);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export const AuditLogsController = router;
