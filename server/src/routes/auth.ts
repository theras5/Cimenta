import express from 'express';
import { findProfileByPhone, logInWithPassword, signInWithPassword } from '../controllers/authControllers';

const authRouter = express.Router();

authRouter.post("/register", signInWithPassword);

authRouter.post("/login", logInWithPassword);

authRouter.get("/profile", findProfileByPhone);

export default authRouter;