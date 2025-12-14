import express from 'express';
import { 
    getAllSites, 
    getSiteById, 
    createSite, 
    updateSiteById, 
    deleteSiteById,
    getSitesByUser,
    getAdminSitesByUser,
    validateUserIsAdmin,
    getSiteAdmins,
    getSiteClients
} from '../controllers/siteController';

const siteRouter = express.Router();


siteRouter.get("/", getAllSites);
siteRouter.get("/user/:userId", getSitesByUser);
siteRouter.get("/user/:userId/admin", getAdminSitesByUser);
siteRouter.get("/:siteId/admins", getSiteAdmins);
siteRouter.get("/:siteId/clients", getSiteClients);
siteRouter.get("/:id/admin/:userId", validateUserIsAdmin);
siteRouter.get("/:id", getSiteById);
siteRouter.post("/", createSite);
siteRouter.put("/:id", updateSiteById);
siteRouter.delete("/:id", deleteSiteById);


export default siteRouter;