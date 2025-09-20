import express from 'express';
import { logInWithPassword, signInWithPassword } from '../controllers/authControllers';
const authRouter = express.Router();

authRouter.post("/auth/register", signInWithPassword);

authRouter.post("/auth/login", logInWithPassword);

export default authRouter;