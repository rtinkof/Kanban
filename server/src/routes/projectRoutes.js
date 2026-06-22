import { Router } from "express";
import { getProjects, createProject, getProjectMembers, addMember, removeMember } from "../controllers/projectController.js";
import requireAuth from "../middleware/auth.js";

const router = Router();

// все роуты проектов требуют авторизации
router.use(requireAuth);

router.get("/", getProjects);
router.post("/", createProject);
router.get("/:id/members", getProjectMembers);
router.post("/:id/members", addMember);
router.delete("/:id/members/:userId", removeMember);

export default router;