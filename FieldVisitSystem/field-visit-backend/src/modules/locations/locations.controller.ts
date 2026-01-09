import { Router, Request, Response } from 'express';
import { LocationsService } from './locations.service';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
    try {
        const location = await LocationsService.create(req.body);
        res.json(location);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.get('/', async (req: Request, res: Response) => {
    try {
        const locations = await LocationsService.findAll(req.query);
        res.json(locations);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export const LocationsController = router;
