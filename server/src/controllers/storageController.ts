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
    const filePath = fileName;

    console.log("Subiendo archivo:", fileName);

    // Subir archivo a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true
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

    // Actualizar avatar_url en el perfil del usuario
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (updateError) {
      console.error("Error al actualizar perfil:", updateError);
      throw new AppError(updateError.message, 400);
    }

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

export const deleteProfilePicture = async (req: Request, res: Response, next: NextFunction) => {
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

    // Obtener el avatar_url actual del perfil
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error("Error al obtener perfil:", profileError);
      throw new AppError(profileError.message, 400);
    }

    // Si hay una imagen, eliminarla de Storage
    if (profileData?.avatar_url) {
      // Extraer el path del archivo de la URL pública
      const urlParts = profileData.avatar_url.split('/');
      const filePath = urlParts[urlParts.length - 1];

      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([filePath]);

      if (deleteError) {
        console.error("Error al eliminar archivo de Storage:", deleteError);
        // No lanzar error, continuar con la actualización del perfil
      }
    }

    // Actualizar el perfil para eliminar la referencia al avatar
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.id);

    if (updateError) {
      console.error("Error al actualizar perfil:", updateError);
      throw new AppError(updateError.message, 400);
    }

    console.log("Avatar eliminado exitosamente");

    res.status(200).json({
      message: "Avatar eliminado correctamente"
    });

  } catch (error: AppError | any) {
    console.error("Error al eliminar avatar:", error);
    res.status(error.statusCode || 500).json({
      error: error.message || "Error interno del servidor"
    });
  }
};

export const getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const userId = req.params.userId;
    
    if (!token) {
      return res.status(401).json({
        error: "Token de autenticación requerido"
      });
    }

    // Verificar el token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        error: "Token inválido o expirado"
      });
    }

    // Solo permitir que los usuarios obtengan su propio perfil
    if (user.id !== userId) {
      return res.status(403).json({
        error: "No tienes permiso para acceder a este perfil"
      });
    }

    // Obtener el perfil del usuario
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error("Error al obtener perfil:", profileError);
      throw new AppError(profileError.message, 400);
    }

    res.status(200).json(profileData);

  } catch (error: AppError | any) {
    console.error("Error al obtener perfil:", error);
    res.status(error.statusCode || 500).json({
      error: error.message || "Error interno del servidor"
    });
  }
};

export const getAvatarUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const userId = req.params.userId;
    
    if (!token) {
      return res.status(401).json({
        error: "Token de autenticación requerido"
      });
    }

    // Verificar el token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        error: "Token inválido o expirado"
      });
    }

    // Solo permitir que los usuarios obtengan su propio avatar
    if (user.id !== userId) {
      return res.status(403).json({
        error: "No tienes permiso para acceder a este recurso"
      });
    }

    // Obtener el avatar_url del perfil
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error("Error al obtener avatar:", profileError);
      throw new AppError(profileError.message, 400);
    }

    res.status(200).json({ avatarUrl: profileData?.avatar_url || null });

  } catch (error: AppError | any) {
    console.error("Error al obtener avatar:", error);
    res.status(error.statusCode || 500).json({
      error: error.message || "Error interno del servidor"
    });
  }
};
