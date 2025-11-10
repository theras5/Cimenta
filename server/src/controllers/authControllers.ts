import express, { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { logInWithPasswordService, signInWithPasswordService } from '../services/authService';
import { AppError } from '../errors/AppError';

export const signInWithPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;

    console.log("Intento de registro:", { email, name }); // Para debug

    const data = await signInWithPasswordService(email, password, name);

    // Construir objeto user con la estructura correcta
    const user = {
      id: data.user?.id!,
      email: data.user?.email!,
      name: name || data.user?.email!.split('@')[0],
    };

    console.log("Registro exitoso para:", email);
    res.status(201).json({
      success: true,
      message: "Usuario registrado exitosamente",
      user: user,
      token: data.session?.access_token,
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

    console.log("Login exitoso, user_metadata:", data.user.user_metadata);

    // Construir objeto user
    const user = {
      id: data.user.id,
      email: data.user.email!,
      name: data.user.user_metadata.name || data.user.email!.split('@')[0],
    };

    console.log("Retornando usuario en login:", user);

    res.status(200).json({
      success: true,
      message: "Login exitoso",
      user: user,
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

export const updateUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.error("No se proporcionó token");
      return res.status(401).json({
        error: "Token de autenticación requerido"
      });
    }

    const { name } = req.body;
    console.log("Intentando actualizar usuario con:", { name });

    // Verificar el token y obtener el usuario
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      console.error("Error al verificar token:", authError);
      return res.status(401).json({
        error: "Token inválido o expirado"
      });
    }

    console.log("Usuario autenticado:", authUser.id);
    console.log("Metadata actual:", authUser.user_metadata);

    // Construir los nuevos metadatos
    const newMetadata: any = {
      ...authUser.user_metadata,
    };
    
    if (name !== undefined) {
      newMetadata.name = name;
    }

    console.log("Nuevos metadatos a guardar:", newMetadata);

    // Actualizar los metadatos del usuario usando el cliente admin
    const { data: adminData, error: adminError } = await supabase.auth.admin.updateUserById(
      authUser.id,
      {
        user_metadata: newMetadata
      }
    );

    if (adminError) {
      console.error("Error al actualizar metadatos:", adminError);
      throw new AppError(adminError.message, 400);
    }

    console.log("Usuario actualizado exitosamente en Supabase");
    console.log("Metadata guardada:", adminData.user.user_metadata);

    // Construir el objeto user actualizado
    const updatedUser = {
      id: adminData.user.id,
      email: adminData.user.email!,
      name: adminData.user.user_metadata.name || authUser.email!.split('@')[0],
    };

    console.log("Retornando usuario actualizado:", updatedUser);
    res.status(200).json(updatedUser);

  } catch (error: AppError | any) {
    console.error("Error al actualizar usuario:", error);
    res.status(error.statusCode || 500).json({
      error: error.message || "Error interno del servidor"
    });
  }
};