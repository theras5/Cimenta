import { NextFunction, Request, Response } from 'express';
import { logInWithPasswordService, signInWithPasswordService } from '../services/authService';
import { AppError } from '../errors/AppError';
import { createProfile, getProfileByPhone, addWhatsappJidToProfile } from '../services/profileService';
import { supabase } from '../config/supabase';

export const signInWithPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;

    console.log("Intento de registro:", { email, name }); // Para debug

    const data = await signInWithPasswordService(email, password, name);

    if (!data.user) {
      throw new AppError("No se pudo crear el usuario en la tabla auth", 500);
    }

    // Intentar crear el perfil, pero no bloquear el registro si falla (como en el código antiguo)
    try {
      await createProfile(data.user.id, name, email);
    } catch (profileError: any) {
      console.log("Error al crear perfil:", profileError.message);
      // No lanzamos error para no bloquear el registro
      // El usuario ya está creado en auth, el perfil se puede crear después
    }

    // Construir objeto user con la estructura correcta
    const user = {
      id: data.user.id,
      email: data.user.email!,
      name: name || data.user.email!.split('@')[0],
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
    res.status(error.statusCode || 500).json({
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

    try {
      // Actualizar los metadatos del usuario usando la API admin
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        authUser.id,
        {
          user_metadata: newMetadata
        }
      );

      if (updateError) {
        console.error("Error al actualizar metadatos:", updateError);
        throw new AppError(updateError.message, 400);
      }

      console.log("Usuario actualizado exitosamente en Supabase");
      console.log("Metadata guardada:", updateData.user?.user_metadata);

      // Si se actualizó el nombre, actualizar también todos los updates del usuario
      if (name !== undefined) {
        const { error: updateUpdatesError } = await supabase
          .from('updates')
          .update({ user_name: name })
          .eq('user_id', authUser.id);

        if (updateUpdatesError) {
          console.error("Error al actualizar nombre en updates:", updateUpdatesError);
          // No lanzamos error aquí, solo lo logueamos
        } else {
          console.log("Nombre actualizado en todos los updates del usuario");
        }
      }

      // Construir el objeto user actualizado
      const updatedUser = {
        id: updateData.user?.id || authUser.id,
        email: updateData.user?.email || authUser.email!,
        name: newMetadata.name || authUser.email!.split('@')[0],
      };

      console.log("Retornando usuario actualizado:", updatedUser);
      res.status(200).json(updatedUser);
    } catch (adminError) {
      // Si falla la actualización con admin, devolver error pero no crashear
      console.error("Error con admin API, continuando sin actualizar metadata en Supabase:", adminError);
      
      // Devolver el usuario con los datos actuales más el nombre nuevo solicitado
      const updatedUser = {
        id: authUser.id,
        email: authUser.email!,
        name: name || authUser.user_metadata?.name || authUser.email!.split('@')[0],
      };
      
      res.status(200).json(updatedUser);
    }

  } catch (error: AppError | any) {
    console.error("Error al actualizar usuario:", error);
    res.status(error.statusCode || 500).json({
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

    // Si no se encuentra el perfil, devolver null en lugar de error
    if (!profile) {
      return res.status(404).json({ message: "Perfil no encontrado para el número de WhatsApp proporcionado" });
    }

    res.status(200).json(profile);

  } catch (error: AppError | any) {
    console.error("Error en findProfileByPhone:", error);

    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const addWhatsappJid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { whatsapp_jid, name } = req.body;

    if (!whatsapp_jid || typeof whatsapp_jid !== 'string') {
      throw new AppError("El parámetro whatsapp_jid es requerido y debe ser una cadena.", 400);
    }

    const profile = await addWhatsappJidToProfile(whatsapp_jid, name);

    res.status(200).json({
      success: true,
      message: "whatsapp_jid agregado exitosamente",
      profile
    });

  } catch (error: AppError | any) {
    console.error("Error en addWhatsappJid:", error);

    res.status(error.statusCode || 500).json({ message: error.message });
  }
};