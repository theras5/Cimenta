import express, { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { logInWithPasswordService, signInWithPasswordService } from '../services/authService';
import { AppError } from '../errors/AppError';

export const signInWithPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;

    console.log("Intento de registro:", { email, name }); // Para debug

    const data = await signInWithPasswordService(email, password, name);

    console.log("Registro exitoso para:", email);
    res.status(201).json({
      success: true,
      message: "Usuario registrado exitosamente",
      user: data.user,
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