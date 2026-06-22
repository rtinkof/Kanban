import { Router } from "express";
import {
  createCard, updateCard, deleteCard, moveCard,
  addSticker, updateSticker, deleteSticker,
} from "../controllers/cardController.js";
import requireAuth from "../middleware/auth.js";
import requireProjectAccess from "../middleware/projectAccess.js";

const router = Router();
router.use(requireAuth);

router.post("/columns/:columnId/cards", requireProjectAccess, createCard);
router.patch("/cards/:cardId", requireProjectAccess, updateCard);
router.delete("/cards/:cardId", requireProjectAccess, deleteCard);
router.patch("/cards/:cardId/move", requireProjectAccess, moveCard);

router.post("/cards/:cardId/stickers", requireProjectAccess, addSticker);
router.patch("/stickers/:stickerId", requireProjectAccess, updateSticker);
router.delete("/stickers/:stickerId", requireProjectAccess, deleteSticker);

export default router;
