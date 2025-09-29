import { NextFunction, Request, Response } from "express";
import { supabase } from "../config/supabase";

interface Update {
  id: number;
  created_at: string;
  user_id: string;
  title: string;
  description?: string;
  image_url?: string;
}

//@desc get all updates
//@route GET /updates
export const getUpdates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Consultar la tabla correcta: "updates"
    const { data, error } = await supabase.from("updates").select("*").order('created_at', { ascending: false });

    if (error) {
      return next(error);
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
};

//@desc get a single update
//@route GET /updates/:id
export const getUpdate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id;

    const { data, error } = await supabase
      .from("updates")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return res.status(404).json({ error: error.message });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

//@desc create an update
//@route POST /updates
export const postUpdate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const updateToCreate: Omit<Update, "id" | "created_at"> = req.body;

    if (!updateToCreate.title) {
      return res
        .status(400)
        .json({ message: "El campo 'title' es obligatorio." });
    }

    // El método .select() al final hace que Supabase devuelva el registro actualizado.
    const { data, error } = await supabase
      .from("updates")
      .insert([updateToCreate])
      .select()
      .single(); // .single() para que devuelva un solo objeto y no un array

    if (error) {
      // Si hay un error en la consulta, lo pasamos al middleware de errores
      return next(error);
    }

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

//@desc update an update
//@route PUT /updates/:id
export const putUpdate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id;
    // Los datos a actualizar. Partial<Task> hace que todas las propiedades sean opcionales.
    const updateToUpdate: Partial<Update> = req.body;

    // El método .select() al final hace que Supabase devuelva el registro actualizado.
    const { data, error } = await supabase
      .from("updates")
      .update(updateToUpdate)
      .eq("id", id)
      .select()
      .single(); // .single() para que devuelva un solo objeto y no un array

    if (error) {
      // Si hay un error en la consulta, lo pasamos al middleware de errores
      return next(error);
    }

    if (!data) {
      // Si no se encontró la tarea, data será null
      return res
        .status(404)
        .json({ message: `No se encontró el avance con el id ${id}` });
    }

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

export const deleteUpdate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id;

    // Eliminar la tarea con el ID especificado
    const { error } = await supabase.from("updates").delete().eq("id", id);

    if (error) {
      // Si hay un error en la consulta, lo pasamos al middleware de errores
      return next(error);
    }

    // Para operaciones DELETE exitosas, es común devolver un 204 (sin contenido)
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
