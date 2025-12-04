import { NextFunction, Request, Response } from "express";
import { 
    getAllSitesService, 
    getSiteByIdService, 
    createSiteService, 
    updateSiteByIdService, 
    deleteSiteByIdService,
    createBelongsToService,
    getSitesByUserService,
    getAdminSitesByUserService,
    validateUserIsAdminService,
    getSiteAdminsService
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
        const { address, role, user_id } = req.body;

        if (!address) {
            return res.status(400).json({ error: "address is required" });
        }
        if (!role) {
            return res.status(400).json({ error: "role is required" });
        }
        if (!user_id) {
            return res.status(400).json({ error: "user_id is required" });
        }

        
        const data = await createSiteService({ address });

        // 2. Crear belongs_to
        await createBelongsToService({ user_id, site_id: data.id, role });

        res.status(201).json(data);
    } catch (error) {
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

export const getAdminSitesByUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.userId;        
        const sites = await getAdminSitesByUserService(userId);
        
        res.status(200).json(sites);
    } catch (err) {
        next(err);
    }
};

export const validateUserIsAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // La ruta es /:id/admin/:userId, entonces:
        // - req.params.id es el siteId
        // - req.params.userId es el userId
        const siteId = req.params.id;
        const userId = req.params.userId;
        
        console.log(`[validateUserIsAdmin controller] Verificando si usuario ${userId} es admin del sitio ${siteId}`);
        
        const isAdmin = await validateUserIsAdminService(userId, siteId);
        
        res.status(200).json({ isAdmin });
    } catch (err) {
        next(err);
    }
};

export const getSiteAdmins = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const siteId = req.params.siteId;
        const admins = await getSiteAdminsService(siteId);
        
        res.status(200).json(admins);
    } catch (err) {
        next(err);
    }
};