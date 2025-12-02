import { Request, Response, NextFunction } from 'express';
import {
  createInvitationService,
  getInvitationByTokenService,
  acceptInvitationService,
  getPendingInvitationsBySiteService
} from '../services/invitationService';
import { sendInvitationEmail } from '../services/emailService';

// Crear invitación
export const createInvitation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, site_id, role } = req.body;

    if (!email || !site_id || !role) {
      return res.status(400).json({ error: 'Email, site_id y role son obligatorios' });
    }

    if (!['admin', 'client'].includes(role)) {
      return res.status(400).json({ error: 'El rol debe ser "admin" o "client"' });
    }

    const invitation = await createInvitationService({
      email,
      site_id,
      role
    });

    // Enviar email
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const invitationLink = `${appUrl}/accept-invitation?token=${invitation.token}`;
    await sendInvitationEmail(email, invitationLink, site_id);

    res.status(201).json({
      message: 'Invitación creada y enviada exitosamente',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at
      }
    });
  } catch (error) {
    next(error);
  }
};

// Obtener invitación por token
export const getInvitationByToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: 'Token es obligatorio' });
    }

    const invitation = await getInvitationByTokenService(token);
    res.status(200).json(invitation);
  } catch (error: any) {
    if (error.message === 'La invitación ha expirado') {
      return res.status(410).json({ error: error.message });
    }
    next(error);
  }
};

// Aceptar invitación
export const acceptInvitation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const { user_id } = req.body;

    if (!token || !user_id) {
      return res.status(400).json({ error: 'Token y user_id son obligatorios' });
    }

    const invitation = await acceptInvitationService(token, user_id);

    res.status(200).json({
      message: 'Invitación aceptada exitosamente',
      site_id: invitation.site_id,
      role: invitation.role
    });
  } catch (error: any) {
    if (error.message === 'Ya perteneces a esta obra') {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
};

// Obtener invitaciones pendientes de una obra
export const getPendingInvitationsBySite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { siteId } = req.params;

    if (!siteId) {
      return res.status(400).json({ error: 'siteId es obligatorio' });
    }

    const invitations = await getPendingInvitationsBySiteService(siteId);
    res.status(200).json(invitations);
  } catch (error) {
    next(error);
  }
};
