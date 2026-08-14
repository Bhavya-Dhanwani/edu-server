import express from "express";
import { StudentSectionEnrollmentController } from "../controllers/studentSectionEnrollment.controller.js";
import {
  createEnrollmentValidator,
  updateEnrollmentValidator,
} from "../middlewares/validators/studentSectionEnrollment.validator.js";
import { identifyUser, checkPermission, requireOpenAcademicYear } from "../middlewares/security/index.js";

const router = express.Router();
const ctrl = new StudentSectionEnrollmentController();

// Enroll Student
router.post("/", identifyUser, checkPermission("create:enrollments"), requireOpenAcademicYear, createEnrollmentValidator, ctrl.create);

// Get All
router.get("/", identifyUser, checkPermission("read:enrollments"), ctrl.getAll);

// Get One
router.get("/:id", identifyUser, checkPermission("read:enrollments"), ctrl.getOne);

// Update (transfer)
router.patch("/:id", identifyUser, checkPermission("update:enrollments"), requireOpenAcademicYear, updateEnrollmentValidator, ctrl.update);

// Delete
router.delete("/:id", identifyUser, checkPermission("delete:enrollments"), ctrl.delete);

export default router;