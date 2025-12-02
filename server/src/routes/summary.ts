import express from 'express';
import { getSiteSummaryPDF, getAllSitesSummaryPDF } from '../controllers/summaryController';

const router = express.Router();

// GET /summary/all/pdf - Generar PDF de resumen de todas las obras
router.get('/all/pdf', getAllSitesSummaryPDF);

// GET /summary/:siteId/pdf - Generar PDF de resumen de obra
router.get('/:siteId/pdf', getSiteSummaryPDF);

export default router;
