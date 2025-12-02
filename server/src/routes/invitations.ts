import { Router } from 'express';
import {
  createInvitation,
  getInvitationByToken,
  acceptInvitation,
  getPendingInvitationsBySite
} from '../controllers/invitationController';

const router = Router();

// POST /invitations - Crear una nueva invitación
router.post('/', createInvitation);

// GET /invitations/token/:token - Obtener invitación por token
router.get('/token/:token', getInvitationByToken);

// POST /invitations/accept/:token - Aceptar invitación
router.post('/accept/:token', acceptInvitation);

// GET /invitations/site/:siteId - Obtener invitaciones pendientes de una obra
router.get('/site/:siteId', getPendingInvitationsBySite);

export default router;
