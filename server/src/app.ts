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

// server/src/app.ts
import cors from "cors";

dotenv.config();

import errorMiddleware from "./middlewares/errorMiddleware";

const app = express();

app.use(express.json());

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

// Middleware de manejo de errores (DEBE IR AL FINAL)
app.use(errorMiddleware);

export default app;
