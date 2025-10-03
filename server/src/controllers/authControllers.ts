import { NextFunction, Request, Response } from 'express';
import { logInWithPasswordService, signInWithPasswordService } from '../services/authService';
import { AppError } from '../errors/AppError';
import { createProfile, getProfileByPhone } from '../services/profileService';

export const signInWithPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;

    console.log("Intento de registro:", { email, name }); // Para debug

    const { user } = await signInWithPasswordService(email, password, name);

    if (!user) {
      throw new AppError("No se pudo crear el usuario en la tabla auth", 500);
    }

    await createProfile(user.id, name);

    console.log("Registro exitoso para:", email);
    res.status(201).json({
      success: true,
      message: "Usuario registrado exitosamente",
      user: user,
    });

  } catch (error: AppError | any) {
    console.error("Error en registro:", error);
    res.status(error.statusCode).json({
      error: error.message || "Error interno del servidor"
    });
  }
};

export const logInWithPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const data = await logInWithPasswordService(email, password);

    res.status(200).json({
      success: true,
      message: "Login exitoso",
      user: data.user,
      session: data.session,
      token: data.session?.access_token, // Para usar en otras llamadas
    });

  } catch (error: AppError | any) {
    console.error("Error en login:", error);
    res.status(error.statusCode).json({
      error: error.message || "Error interno del servidor"
    });
  }
};


export const findProfileByPhone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { whatsapp_jid } = req.query;

    if (!whatsapp_jid || typeof whatsapp_jid !== 'string') {
      throw new AppError("El parámetro whatsapp_jid es requerido y debe ser una cadena.", 400);
    }

    const profile = await getProfileByPhone(whatsapp_jid);

    res.status(200).json(profile);

  } catch (error: AppError | any) {
    console.error("Error en login:", error);

    res.status(error.statusCode).json({ message: error.message });
  }
};