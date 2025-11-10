import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AppError } from '../errors/AppError';
import multer from 'multer';

export const uploadProfilePicture = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: "Token de autenticación requerido"
      });
    }

    // Verificar el token y obtener el usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        error: "Token inválido o expirado"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "No se proporcionó ningún archivo"
      });
    }

    const file = req.file;
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `profile-pictures/${fileName}`;

    console.log("Subiendo archivo:", fileName);

    // Subir archivo a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error("Error al subir archivo a Supabase:", uploadError);
      throw new AppError(uploadError.message, 400);
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    console.log("Archivo subido exitosamente:", publicUrl);

    res.status(200).json({
      url: publicUrl,
      path: filePath
    });

  } catch (error: AppError | any) {
    console.error("Error al subir imagen:", error);
    res.status(error.statusCode || 500).json({
      error: error.message || "Error interno del servidor"
    });
  }
};
