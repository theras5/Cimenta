import { Router } from "express";
import { createSite, deleteSiteById, getAllSites, getSiteById, updateSiteById } from "../controllers/siteController";

const siteRouter = Router();

siteRouter.get("/", getAllSites);
siteRouter.get("/:id", getSiteById);
siteRouter.post("/", createSite);
siteRouter.put("/:id", updateSiteById);
siteRouter.delete("/:id", deleteSiteById);

export default siteRouter;