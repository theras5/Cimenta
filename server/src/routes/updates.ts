import express from "express";
import { deleteUpdate, getUpdate, getUpdates, postUpdate, putUpdate } from "../controllers/updatesController";

const updatesRouter = express.Router();

//get all updates
updatesRouter.get("/updates", getUpdates);

//get a single update
updatesRouter.get("/updates/:id", getUpdate);

//create an update
updatesRouter.post("/updates", postUpdate);

//update an update
updatesRouter.put("/updates/:id", putUpdate);

updatesRouter.delete("/updates/:id", deleteUpdate);

export default updatesRouter;