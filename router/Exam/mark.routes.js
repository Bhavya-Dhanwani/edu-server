import express from "express";
import { MarkController } from "../../controllers/Exam/mark.controller.js";
import {
  createMarkValidator,
  updateMarkValidator,
  bulkCreateMarksValidator,
} from "../../middlewares/validators/Exam/mark.validator.js";
import { identifyUser, checkPermission } from "../../middlewares/security/index.js";

const router = express.Router();
const ctrl = new MarkController();

router.post("/", identifyUser, checkPermission("create:exams"), createMarkValidator, ctrl.create);
router.post("/bulk", identifyUser, checkPermission("create:exams"), bulkCreateMarksValidator, ctrl.bulkCreate);
router.get("/", identifyUser, ctrl.getAll);
router.get("/:id", identifyUser, ctrl.getOne);
router.patch("/:id", identifyUser, checkPermission("update:exams"), updateMarkValidator, ctrl.update);
router.delete("/:id", identifyUser, checkPermission("delete:exams"), ctrl.delete);

export default router;