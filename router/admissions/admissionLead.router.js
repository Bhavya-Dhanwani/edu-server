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
  // checkPermission("create:admissions"),
  createAdmissionLeadValidator,
  ctrl.create,
);

router.get(
  "/",
  identifyUser,
  // checkPermission("read:admissions"),
  ctrl.getAll,
);

router.get(
  "/:id",
  identifyUser,
  // checkPermission("read:admissions"),
  validateUUID("id"),
  ctrl.getOne,
);

router.patch(
  "/:id",
  identifyUser,
  // checkPermission("update:admissions"),
  validateUUID("id"),
  updateAdmissionLeadValidator,
  ctrl.update,
);

router.patch(
  "/:id/status",
  identifyUser,
  // checkPermission("update:admissions"),
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
