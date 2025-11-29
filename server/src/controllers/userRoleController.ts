import { Request, Response } from 'express';
import { getUserRoleInSiteService } from '../services/siteService';

export const getUserRole = async (req: Request, res: Response) => {
    try {
        const { user_id, site_id } = req.query;
        
        if (!user_id || !site_id) {
            return res.status(400).json({ error: 'user_id y site_id son requeridos' });
        }
        
        const role = await getUserRoleInSiteService(user_id as string, site_id as string);
        
        if (!role) {
            return res.status(404).json({ error: 'Usuario no pertenece a este sitio' });
        }
        
        res.json({ role });
    } catch (error) {
        console.error('Error en getUserRole:', error);
        res.status(500).json({ error: 'Error al obtener rol del usuario' });
    }
};