import express from 'express';
import {
    getAllPurchases,
    getPurchaseById,
    createPurchase,
    updatePurchaseById,
    deletePurchaseById,
    getPurchasesBySite,
    // getPurchasesByStatus,
    getPurchasesByUser,
    updatePurchaseStatus
} from '../controllers/purchasesController';

const router = express.Router();

// Rutas CRUD básicas
router.get('/', getAllPurchases);
router.get('/:id', getPurchaseById);
router.post('/', createPurchase);
router.put('/:id', updatePurchaseById);
router.delete('/:id', deletePurchaseById);

// Rutas especializadas
router.get('/site/:siteId', getPurchasesBySite);
// router.get('/status/:status', getPurchasesByStatus);
router.get('/user/:userId', getPurchasesByUser);
router.patch('/:id/status', updatePurchaseStatus);

export default router;