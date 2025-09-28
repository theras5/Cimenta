import express from "express";
import dotenv from "dotenv";
import updates from './routes/updates';

// server/src/app.ts
import cors from "cors";

dotenv.config();

import errorMiddleware from "./middlewares/errorMiddleware";
import sites from './routes/sites';
import tasks from "./routes/tasks";
import auth from "./routes/auth";

const app = express();

app.use(express.json());

app.use(cors());

app.use('/api/sites', sites);
app.use('/api', tasks);

app.use(auth);

app.use(updates);

app.use(errorMiddleware); // esto tiene que ir siempre al final

export default app;
