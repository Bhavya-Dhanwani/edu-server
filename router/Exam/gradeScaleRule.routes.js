import express from "express";
import { GradeScaleRuleController } from "../../controllers/Exam/gradeScaleRule.controller.js";
import {
  createGradeScaleRuleValidator,
  updateGradeScaleRuleValidator,
} from "../../middlewares/validators/Exam/gradeScaleRule.validator.js";
import { identifyUser, checkPermission } from "../../middlewares/security/index.js";

const router = express.Router();
const ctrl = new GradeScaleRuleController();

// Nested under grade-scale: /grade-scales/:gradeScaleId/rules
router.post("/", identifyUser, checkPermission("create:exams"), createGradeScaleRuleValidator, ctrl.create);
router.get("/", identifyUser, ctrl.getAll);
router.get("/:id", identifyUser, ctrl.getOne);
router.patch("/:id", identifyUser, checkPermission("update:exams"), updateGradeScaleRuleValidator, ctrl.update);
router.delete("/:id", identifyUser, checkPermission("delete:exams"), ctrl.delete);

export default router;