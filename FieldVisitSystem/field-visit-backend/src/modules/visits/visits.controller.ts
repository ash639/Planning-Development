import { Router, Request, Response } from 'express';
import { VisitsService } from './visits.service';
import { PdfGenerator } from '../../common/utils/pdf-generator';

const router = Router();

// Create Visit
router.post('/', async (req: Request, res: Response) => {
    try {
        const visit = await VisitsService.create(req.body);
        res.json(visit);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// List Visits
router.get('/', async (req: Request, res: Response) => {
    try {
        const visits = await VisitsService.findAll(req.query);
        res.json(visits);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Download PDF Report
router.get('/:id/report', async (req: Request, res: Response) => {
    try {
        const visit = await VisitsService.findOne(req.params.id);
        if (!visit) return res.status(404).json({ error: 'Visit not found' });

        const pdfBuffer = await PdfGenerator.generateVisitReport(visit);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Visit_Report_${visit.id}.pdf`);
        res.send(pdfBuffer);
    } catch (error: any) {
        console.error('PDF Gen Error:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// Get One
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const visit = await VisitsService.findOne(req.params.id);
        if (!visit) return res.status(404).json({ error: 'Not found' });
        res.json(visit);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Update Status (Check-in/Check-out handled here)
router.patch('/:id/status', async (req: Request, res: Response) => {
    try {
        const { status, ...rest } = req.body;
        console.log(`Visit Status Update [${req.params.id}]:`, status, JSON.stringify(rest));
        // Pass the entire rest object which contains reportData, travelDistance, coordinates, etc.
        const visit = await VisitsService.updateStatus(req.params.id, status, rest);
        res.json(visit);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Delete
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        await VisitsService.delete(req.params.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export const VisitsController = router;
