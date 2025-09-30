import express from 'express';
import { 
    getAllSites, 
    getSiteById, 
    createSite, 
    updateSiteById, 
    deleteSiteById 
} from '../controllers/siteController';

const siteRouter = express.Router();

siteRouter.get("/", getAllSites);
siteRouter.get("/:id", getSiteById);
siteRouter.post("/", createSite);
siteRouter.put("/:id", updateSiteById);
siteRouter.delete("/:id", deleteSiteById);

export default siteRouter;