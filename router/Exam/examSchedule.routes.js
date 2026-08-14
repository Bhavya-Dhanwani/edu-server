import express from "express";
import { ExamScheduleController } from "../../controllers/Exam/examSchedule.controller.js";
import {
  createExamScheduleValidator,
  updateExamScheduleValidator,
} from "../../middlewares/validators/Exam/examSchedule.validator.js";
import { identifyUser, checkPermission, requireOpenAcademicYear } from "../../middlewares/security/index.js";

const router = express.Router();
const ctrl = new ExamScheduleController();

router.post("/", identifyUser, checkPermission("create:exams"), requireOpenAcademicYear, createExamScheduleValidator, ctrl.create);
router.get("/", identifyUser, ctrl.getAll);
router.get("/:id", identifyUser, ctrl.getOne);
router.patch("/:id", identifyUser, checkPermission("update:exams"), requireOpenAcademicYear, updateExamScheduleValidator, ctrl.update);
router.delete("/:id", identifyUser, checkPermission("delete:exams"), requireOpenAcademicYear, ctrl.delete);

export default router;