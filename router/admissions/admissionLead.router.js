import express from "express";
import { AdmissionLeadController } from "../../controllers/admissions/admissionLead.controller.js";
import {
  createAdmissionLeadValidator,
  updateAdmissionLeadValidator,
  updateAdmissionLeadStatusValidator,
  convertAdmissionLeadValidator,
} from "../../middlewares/validators/admissionLead.validator.js";
import { identifyUser, requireOpenAcademicYear } from "../../middlewares/security/index.js";
import { validateUUID } from "../../middlewares/validators/uuid.validator.js";

const router = express.Router();
const ctrl = new AdmissionLeadController();

router.post(
  "/",
  identifyUser,
  requireOpenAcademicYear,
  createAdmissionLeadValidator,
  ctrl.create,
);

router.get(
  "/",
  identifyUser,
  ctrl.getAll,
);

router.get(
  "/:id",
  identifyUser,
  validateUUID("id"),
  ctrl.getOne,
);

router.patch(
  "/:id",
  identifyUser,
  requireOpenAcademicYear,
  validateUUID("id"),
  updateAdmissionLeadValidator,
  ctrl.update,
);

router.patch(
  "/:id/status",
  identifyUser,
  requireOpenAcademicYear,
  validateUUID("id"),
  updateAdmissionLeadStatusValidator,
  ctrl.updateStatus,
);

router.post(
  "/:id/convert",
  identifyUser,
  // checkPermission("update:admissions"),
  requireOpenAcademicYear,
  validateUUID("id"),
  convertAdmissionLeadValidator,
  ctrl.convert,
);

export default router;
