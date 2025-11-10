import { NextFunction, Request, Response } from "express";
import { 
    getAllSitesService, 
    getSiteByIdService, 
    createSiteService, 
    updateSiteByIdService, 
    deleteSiteByIdService,
    createBelongsToService,
    getSitesByUserService 
} from "../services/siteService";

export const getAllSites = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await getAllSitesService();
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

export const getSiteById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        const data = await getSiteByIdService(id);
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

export const createSite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('📥 createSite - Body recibido:', req.body);
        const { address, role, user_id } = req.body;

        if (!address) {
            console.log('❌ Error: address is required');
            return res.status(400).json({ error: "address is required" });
        }
        if (!role) {
            console.log('❌ Error: role is required');
            return res.status(400).json({ error: "role is required" });
        }
        if (!user_id) {
            console.log('❌ Error: user_id is required');
            return res.status(400).json({ error: "user_id is required" });
        }

        console.log('🏗️ Creando sitio con address:', address);
        const data = await createSiteService({ address });
        console.log('✅ Sitio creado:', data);

        // 2. Crear belongs_to
        console.log('🔗 Creando belongs_to:', { user_id, site_id: data.id, role });
        await createBelongsToService({ user_id, site_id: data.id, role });
        console.log('✅ Belongs_to creado');

        res.status(201).json(data);
    } catch (error) {
        console.error('❌ Error en createSite:', error);
        next(error);
    }
};

export const updateSiteById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        const siteToUpdate = req.body;
        const data = await updateSiteByIdService(id, siteToUpdate);
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

export const deleteSiteById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        await deleteSiteByIdService(id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};


export const getSitesByUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.userId;        
        const sites = await getSitesByUserService(userId);
        
        res.status(200).json(sites);
    } catch (err) {
        next(err);
    }
};