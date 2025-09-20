import express, { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const signInWithPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;

    console.log("Intento de registro:", { email, name }); // Para debug

    if (!email || !password || !name) {
      return res.status(400).json({
        error: "Email, contraseña y nombre son requeridos"
      });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        }
      }
    });

    if (error) {
      console.log("Error de Supabase en registro:", error.message);
      return res.status(400).json({
        error: error.message
      });
    }

    console.log("Registro exitoso para:", email);
    res.status(201).json({
      success: true,
      message: "Usuario registrado exitosamente",
      user: data.user,
    });

  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({
      error: "Error interno del servidor"
    });
  }
};

export const logInWithPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email y contraseña son requeridos"
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({
        error: error.message
      });
    }

    res.status(200).json({
      success: true,
      message: "Login exitoso",
      user: data.user,
      session: data.session,
      token: data.session?.access_token, // Para usar en otras llamadas
    });

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({
      error: "Error interno del servidor"
    });
  }
};