import { Router } from "express";
import { createColumn, renameColumn, deleteColumn, moveColumn } from "../controllers/columnController.js";
import requireAuth from "../middleware/auth.js";
import requireProjectAccess from "../middleware/projectAccess.js";

const router = Router();
router.use(requireAuth);

router.post("/boards/:boardId/columns", requireProjectAccess, createColumn);
router.patch("/columns/:columnId", requireProjectAccess, renameColumn);
router.delete("/columns/:columnId", requireProjectAccess, deleteColumn);
router.patch("/columns/:columnId/position", requireProjectAccess, moveColumn);

export default router;
