import express from "express";
import { StudentController } from "../controllers/student.controller.js";
import {
  createStudentValidator,
  updateStudentValidator,
} from "../middlewares/validators/student.validator.js";
import { identifyUser, checkPermission } from "../middlewares/security/index.js";
import { validateUUID } from "../middlewares/validators/uuid.validator.js"
const router = express.Router();
const ctrl = new StudentController();

router.post("/", identifyUser, checkPermission("create:students"), createStudentValidator, ctrl.create);
router.get("/unassigned", identifyUser, checkPermission("read:students"), ctrl.getUnassigned);
router.get("/", identifyUser, checkPermission("read:students"), ctrl.getAll);
router.get("/me", identifyUser, ctrl.getMe);
router.get("/:id", identifyUser, checkPermission("read:students"), validateUUID("id"), ctrl.getOne);
router.patch("/:id", identifyUser, checkPermission("update:students"), validateUUID("id"), updateStudentValidator, ctrl.update);
router.delete("/:id", identifyUser, checkPermission("delete:students"), validateUUID("id"), ctrl.delete);

export default router;
