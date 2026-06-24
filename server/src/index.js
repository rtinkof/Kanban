import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import boardRoutes from "./routes/boardRoutes.js";
import columnRoutes from "./routes/columnRoutes.js";
import cardRoutes from "./routes/cardRoutes.js";
import stickerSettingsRoutes from "./routes/stickerSettingsRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Kanban API работает"
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api", boardRoutes);
app.use("/api", columnRoutes);
app.use("/api", cardRoutes);
app.use("/api", stickerSettingsRoutes);

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});