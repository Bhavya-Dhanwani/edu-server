import express from "express";
import { AttendanceController } from "../controllers/attendance.controller.js";
import {
  createAttendanceValidator,
  updateAttendanceValidator,
  attendanceIdValidator,
  studentIdValidator,
  sectionIdValidator,
  dateParamValidator,
  bulkMarkAttendanceValidator,
  searchAttendanceValidator,
  dateRangeValidator,
} from "../middlewares/validators/attendance.validator.js";
import { identifyUser, checkPermission, requireOpenAcademicYear } from "../middlewares/security/index.js";

const router = express.Router();
const ctrl = new AttendanceController();

// Create: Mark daily attendance
router.post("/", identifyUser, checkPermission("create:attendance"), requireOpenAcademicYear, createAttendanceValidator, ctrl.create);

// Get all daily attendance records
router.get("/", identifyUser, ctrl.getAll);

// Search daily attendance records
router.get("/search", identifyUser, searchAttendanceValidator, ctrl.search);

// Bulk mark daily attendance
router.post("/bulk-mark", identifyUser, checkPermission("create:attendance"), requireOpenAcademicYear, bulkMarkAttendanceValidator, ctrl.bulkMark);

// Get student daily attendance summary
router.get("/student/:studentId/summary", identifyUser, studentIdValidator, dateRangeValidator, ctrl.getStudentSummary);

// Get section daily attendance summary
router.get("/section/:sectionId/summary", identifyUser, sectionIdValidator, dateRangeValidator, ctrl.getSectionSummary);

// Get daily attendance for a specific date
router.get("/date/:date", identifyUser, dateParamValidator, ctrl.getDateAttendance);

// Get all uncorrected daily attendance records
router.get("/uncorrected", identifyUser, ctrl.getUncorrected);

// Get specific daily attendance record by ID
router.get("/:id", identifyUser, attendanceIdValidator, ctrl.getOne);

// Update daily attendance record by ID
router.patch("/:id", identifyUser, checkPermission("update:attendance"), requireOpenAcademicYear, attendanceIdValidator, updateAttendanceValidator, ctrl.update);

// Delete daily attendance record by ID
router.delete("/:id", identifyUser, checkPermission("delete:attendance"), attendanceIdValidator, ctrl.delete);

export default router;
