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
    updatePurchaseStatus,
    uploadPurchaseImage,
    getPurchaseImages
} from '../controllers/purchasesController';

const router = express.Router();

// Rutas especializadas (DEBEN IR PRIMERO para evitar conflictos con /:id)
router.get('/site/:siteId', getPurchasesBySite);
// router.get('/status/:status', getPurchasesByStatus);
router.get('/user/:userId', getPurchasesByUser);
router.patch('/:id/status', updatePurchaseStatus);
router.post('/:id/images', uploadPurchaseImage);
router.get('/:id/images', getPurchaseImages);

// Rutas CRUD básicas
router.get('/', getAllPurchases);
router.get('/:id', getPurchaseById);
router.post('/', createPurchase);
router.put('/:id', updatePurchaseById);
router.delete('/:id', deletePurchaseById);

export default router;