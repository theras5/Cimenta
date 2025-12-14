import express from 'express';
import { findProfileByPhone, logInWithPassword, signInWithPassword, addWhatsappJid, updateUserProfile } from '../controllers/authControllers';

const authRouter = express.Router();

authRouter.post("/register", signInWithPassword);

authRouter.post("/login", logInWithPassword);

authRouter.patch("/update", updateUserProfile);
authRouter.get("/profile", findProfileByPhone);

authRouter.post("/profile/whatsapp", addWhatsappJid);

export default authRouter;