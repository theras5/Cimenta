import express from "express";
import dotenv from "dotenv";

// server/src/app.ts
import cors from "cors";

dotenv.config();

import { supabase } from "./config/supabase";
import errorMiddleware from "./middlewares/errorMiddleware";
/*

GET /tasks/ (te trae todas las tasks creadas)
GET /task/:id (te trae una task con el id indicado)
POST /task (toma un objeto del tipo {id, title, description})
PUT /task:id (modifica un task con el id indicado)
DELETE /task:id (elimina un task con el id indicado)

*/

interface Task {
  id: number;
  user_id: string; // o el tipo que corresponda
  created_at: string;
  title: string;
  description?: string;
  is_urgent: boolean;
  status: "pending" | "in-progress" | "done";
  start_date?: string;
  end_date?: string;
}

const app = express();

app.use(express.json());

app.use(cors());

app.get("/tasks", async (req, res, next) => {
  try {
    // Usamos .from('tasks') para la tabla y .select('*') para obtener todos los registros
    const { data, error } = await supabase.from("tasks").select("*");

    if (error) {
      // Si hay un error, lo pasamos al middleware de errores
      return next(error);
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

app.get("/task/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return res.status(404).json({ error: error.message });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// tenemos que tener definido un TaskT
app.post("/task", async (req, res, next) => {
    try {
        // Los datos a actualizar. Partial<Task> hace que todas las propiedades sean opcionales.
        const taskToCreate: Omit<Task, 'id' | 'created_at'> = req.body;

        if (!taskToCreate.title) {
            return res.status(400).json({ message: "El campo 'title' es obligatorio." });
        }

        // El método .select() al final hace que Supabase devuelva el registro actualizado.
        const { data, error } = await supabase
            .from('tasks') // Asegúrate que 'task' es el nombre correcto de tu tabla
            .insert([taskToCreate])
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
});

// 3. Implementa la ruta PUT
app.put("/task/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    // Los datos a actualizar. Partial<Task> hace que todas las propiedades sean opcionales.
    const taskToUpdate: Partial<Task> = req.body;

    if (isNaN(id)) {
      return res
        .status(400)
        .json({ message: "El ID proporcionado no es un número." });
    }

    // El método .select() al final hace que Supabase devuelva el registro actualizado.
    const { data, error } = await supabase
      .from("tasks") // Asegúrate que 'task' es el nombre correcto de tu tabla
      .update(taskToUpdate)
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
        .json({ message: `No se encontró la tarea con el id ${id}` });
    }

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

// 4. Implementa la ruta DELETE
app.delete("/task/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res
        .status(400)
        .json({ message: "El ID proporcionado no es un número." });
    }

    // Eliminar la tarea con el ID especificado
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (error) {
      // Si hay un error en la consulta, lo pasamos al middleware de errores
      return next(error);
    }

    // Para operaciones DELETE exitosas, es común devolver un 204 (sin contenido)
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.post("/auth/register", async (req, res, next) => {
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
});

app.post("/auth/login", async (req, res, next) => {
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
});








app.use(errorMiddleware); // esto tiene que ir siempre al final

export default app;
