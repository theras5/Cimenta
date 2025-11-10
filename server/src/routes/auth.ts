import express from 'express';
import { logInWithPassword, signInWithPassword, updateUserProfile } from '../controllers/authControllers';

const authRouter = express.Router();

authRouter.post("/register", signInWithPassword);

authRouter.post("/login", logInWithPassword);

authRouter.patch("/update", updateUserProfile);

export default authRouter;