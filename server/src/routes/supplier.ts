import express from 'express'
import { getAllSuppliers } from "../controllers/supplierController"

const supplierRouter = express.Router();

supplierRouter.get("/", getAllSuppliers);

export default supplierRouter