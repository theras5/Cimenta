import express from 'express';
import { logInWithPassword, signInWithPassword } from '../controllers/authControllers';

const authRouter = express.Router();

authRouter.post("/register", signInWithPassword);

authRouter.post("/login", logInWithPassword);

export default authRouter;