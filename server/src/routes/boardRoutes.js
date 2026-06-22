import { Router } from "express";
import { getBoards, createBoard, renameBoard, deleteBoard } from "../controllers/boardController.js";
import requireAuth from "../middleware/auth.js";
import requireProjectAccess from "../middleware/projectAccess.js";

const router = Router();
router.use(requireAuth);

// вложенные в проект
router.get("/projects/:projectId/boards", requireProjectAccess, getBoards);
router.post("/projects/:projectId/boards", requireProjectAccess, createBoard);

// прямые по id доски
router.patch("/boards/:boardId", requireProjectAccess, renameBoard);
router.delete("/boards/:boardId", requireProjectAccess, deleteBoard);

export default router;
