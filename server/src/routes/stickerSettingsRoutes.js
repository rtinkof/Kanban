import { Router } from "express";
import {
  getCustomStickers,
  createCustomSticker,
  updateCustomSticker,
  deleteCustomSticker
} from "../controllers/stickerSettingsController.js";
import requireAuth from "../middleware/auth.js";
import requireProjectAccess from "../middleware/projectAccess.js";

const router = Router();
router.use(requireAuth);

router.get("/boards/:boardId/custom-stickers", requireProjectAccess, getCustomStickers);
router.post("/boards/:boardId/custom-stickers", requireProjectAccess, createCustomSticker);
router.patch("/custom-stickers/:customStickerId", requireProjectAccess, updateCustomSticker);
router.delete("/custom-stickers/:customStickerId", requireProjectAccess, deleteCustomSticker);

export default router;