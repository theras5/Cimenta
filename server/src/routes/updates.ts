import express from "express";
import { deleteUpdate, getUpdate, getUpdates, postUpdate, putUpdate } from "../controllers/updatesController";

const updatesRouter = express.Router();

//get all updates
updatesRouter.get("/", getUpdates);

//get a single update
updatesRouter.get("/:id", getUpdate);

//create an update
updatesRouter.post("/", postUpdate);

//update an update
updatesRouter.put("/:id", putUpdate);

updatesRouter.delete("/:id", deleteUpdate);

export default updatesRouter;