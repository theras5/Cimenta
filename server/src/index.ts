import dotenv from "dotenv";
import express from "express"

dotenv.config();
const app = express();
app.use(express.json());

app.get("/", (req, res) => res.send("Servidor Express corriendo"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
);
