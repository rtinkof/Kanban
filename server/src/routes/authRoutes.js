import { Router } from "express";
import {
  register, login, me, getAllUsers,
  updateUser, resetPassword, archiveUser, restoreUser,
} from "../controllers/authController.js";
import requireAuth from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";

const router = Router();

// Регистрация нового сотрудника — только администратор и только будучи уже
// авторизованным. Публичной самостоятельной регистрации в системе нет.
router.post("/register", requireAuth, requireRole("ADMIN"), register);

router.post("/login", login);
router.get("/me", requireAuth, me);
router.get("/users", requireAuth, getAllUsers);

// Управление сотрудниками — только ADMIN
router.patch("/users/:id", requireAuth, requireRole("ADMIN"), updateUser);
router.patch("/users/:id/password", requireAuth, requireRole("ADMIN"), resetPassword);
router.post("/users/:id/archive", requireAuth, requireRole("ADMIN"), archiveUser);
router.post("/users/:id/restore", requireAuth, requireRole("ADMIN"), restoreUser);

export default router;
