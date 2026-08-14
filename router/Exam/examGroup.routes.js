import express from "express";
import { ExamGroupController } from "../../controllers/Exam/examGroup.controller.js";
import {
  createExamGroupValidator,
  updateExamGroupValidator,
} from "../../middlewares/validators/Exam/examGroup.validator.js";
import { identifyUser, checkPermission, requireOpenAcademicYear } from "../../middlewares/security/index.js";

const router = express.Router();
const ctrl = new ExamGroupController();

router.post("/", identifyUser, checkPermission("create:exams"), requireOpenAcademicYear, createExamGroupValidator, ctrl.create);
router.get("/", identifyUser, ctrl.getAll);
router.get("/:id", identifyUser, ctrl.getOne);
router.patch("/:id", identifyUser, checkPermission("update:exams"), requireOpenAcademicYear, updateExamGroupValidator, ctrl.update);
router.delete("/:id", identifyUser, checkPermission("delete:exams"), requireOpenAcademicYear, ctrl.delete);
router.post("/:id/publish-result", identifyUser, checkPermission("update:exams"), requireOpenAcademicYear, ctrl.publishResult);
router.post("/:id/unpublish-result", identifyUser, checkPermission("update:exams"), requireOpenAcademicYear, ctrl.unpublishResult);

export default router;