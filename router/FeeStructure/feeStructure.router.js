import express from "express";
import { FeeStructureController } from "../../controllers/FeeStructure/feeStructure.controller.js";
import {
  createFeeStructureValidator,
  updateFeeStructureValidator,
  feeStructureIdValidator,
} from "../../middlewares/validators/FeeStructure/feeStructure.validator.js";
import { identifyUser, checkPermission, requireOpenAcademicYear } from "../../middlewares/security/index.js";

const router = express.Router();
const ctrl = new FeeStructureController();

// Create FeeStructure (with optional items)
router.post("/", identifyUser, checkPermission("create:fee-structure"), requireOpenAcademicYear, createFeeStructureValidator, ctrl.create);

// Get all FeeStructures with their items
router.get("/", identifyUser, ctrl.getAll);

// Get specific FeeStructure by ID with all items
router.get("/:id", identifyUser, feeStructureIdValidator, ctrl.getOne);

// Update FeeStructure
router.patch("/:id", identifyUser, checkPermission("update:fee-structure"), requireOpenAcademicYear, feeStructureIdValidator, updateFeeStructureValidator, ctrl.update);

// Delete FeeStructure (including all items)
router.delete("/:id", identifyUser, checkPermission("delete:fee-structure"), feeStructureIdValidator, ctrl.delete);

export default router;
