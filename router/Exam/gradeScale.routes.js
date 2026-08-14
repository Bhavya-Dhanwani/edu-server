import express from "express";
import { GradeScaleController } from "../../controllers/Exam/gradeScale.controller.js";

import {
  createGradeScaleValidator,
  updateGradeScaleValidator,
} from "../../middlewares/validators/Exam/gradeScale.validator.js";

import { identifyUser, checkPermission } from "../../middlewares/security/index.js";

const router = express.Router();
const ctrl = new GradeScaleController();

router.post("/", identifyUser, checkPermission("create:exams"), createGradeScaleValidator, ctrl.create);
router.get("/", identifyUser, ctrl.getAll);
router.get("/default", identifyUser, ctrl.getDefault);  // returns the tenant's default grade scale
router.get("/:id", identifyUser, ctrl.getOne);
router.patch("/:id", identifyUser, checkPermission("update:exams"), updateGradeScaleValidator, ctrl.update);
router.delete("/:id", identifyUser, checkPermission("delete:exams"), ctrl.delete);
router.post("/:id/set-default", identifyUser, checkPermission("update:exams"), ctrl.setDefault);

export default router;