import express from "express";
import dotenv from "dotenv";
import updates from './routes/updates';
import sites from './routes/sites';
import tasks from "./routes/tasks";
import auth from "./routes/auth";
import purchases from "./routes/purchases";
import employees from "./routes/employees";
import clients from "./routes/clients";
import userRole from "./routes/userRole";
import summary from "./routes/summary";
import invitations from "./routes/invitations";
import suppliers from "./routes/supplier";
import workers from "./routes/workers";
import assignedToRoutes from "./routes/assignedTo";

// server/src/app.ts
import cors from "cors";

dotenv.config();

import errorMiddleware from "./middlewares/errorMiddleware";

const app = express();

// Aumenta el tamaño máximo del cuerpo JSON para permitir data URIs grandes (imágenes)
app.use(express.json({ limit: '25mb' }));

app.use(cors());

app.use((req, res, next) => {
    console.log('🌍 PETICIÓN GLOBAL - Método:', req.method, 'URL completa:', req.url, 'Path:', req.path);
    next();
});

app.use("/sites", sites);

app.use("/tasks", tasks);

app.use("/auth", auth);

app.use("/updates", updates);

app.use("/purchases", purchases);

app.use("/employees", employees);

app.use("/clients", clients);

app.use("/user-role", userRole);

app.use("/summary", summary);

app.use("/invitations", invitations);

// Middleware de manejo de errores (DEBE IR AL FINAL)
app.use(errorMiddleware);
app.use("/suppliers", suppliers);

app.use("/workers", workers);

app.use("/assigned-to", assignedToRoutes);

app.use(errorMiddleware); // esto tiene que ir siempre al final

export default app;
