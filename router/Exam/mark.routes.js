import express from "express";
import { MarkController } from "../../controllers/Exam/mark.controller.js";
import {
  createMarkValidator,
  updateMarkValidator,
  bulkCreateMarksValidator,
} from "../../middlewares/validators/Exam/mark.validator.js";
import { identifyUser, checkPermission, requireOpenAcademicYear } from "../../middlewares/security/index.js";
import { validateUUID } from "../../middlewares/validators/uuid.validator.js";

const router = express.Router();
const ctrl = new MarkController();

router.post("/", identifyUser, checkPermission("create:exams"), requireOpenAcademicYear, createMarkValidator, ctrl.create);
router.post("/bulk", identifyUser, checkPermission("create:exams"), requireOpenAcademicYear, bulkCreateMarksValidator, ctrl.bulkCreate);
router.get("/", identifyUser, ctrl.getAll);
router.get("/student-result/:studentId", identifyUser, validateUUID("studentId"), ctrl.getStudentResult);
router.get("/schedule-summary/:scheduleId", identifyUser, ctrl.getScheduleSummary);
router.get("/exam-group-plan/:examGroupId", identifyUser, ctrl.getExamGroupPlan);
router.get("/:id", identifyUser, ctrl.getOne);
router.patch("/:id", identifyUser, checkPermission("update:exams"), requireOpenAcademicYear, updateMarkValidator, ctrl.update);
router.delete("/:id", identifyUser, checkPermission("delete:exams"), requireOpenAcademicYear, ctrl.delete);

export default router;