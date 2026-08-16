import { AppError } from "../../utils/AppError.js";
import { MarkService } from "../../services/Exam/mark.service.js";
import { catchAsync } from "../../utils/catchAsync.js";

const markService = new MarkService();

export class MarkController {
  create = catchAsync(async (req, res) => {
    if (!req.user?.id) {
      throw new AppError("User identity could not be resolved", 401);
    }

    const data = await markService.createMark(
      req.tenantId,
      req.body,
      req.user.id
    );

    res.status(201).json({ success: true, data });
  });

  /**
   * POST /marks/bulk
   * Body: { marks: [...], allowOverwrite: true|false }
   *
   * allowOverwrite defaults to false — existing marks cause a 409 with details.
   * Pass allowOverwrite: true to explicitly update existing records.
   */
  bulkCreate = catchAsync(async (req, res) => {
    if (!req.user?.id) {
      throw new AppError("User identity could not be resolved", 401);
    }

    const allowOverwrite = req.body.allowOverwrite === true;

    const data = await markService.bulkCreateMarks(
      req.tenantId,
      req.body.marks,
      req.user.id,
      allowOverwrite
    );

    res.status(201).json({ success: true, data });
  });

  getAll = catchAsync(async (req, res) => {
    const result = await markService.getAllMarks(req.tenantId, req.query);
    res.status(200).json({ success: true, ...result });
  });

  getOne = catchAsync(async (req, res) => {
    const data = await markService.getMarkById(req.params.id, req.tenantId);
    res.status(200).json({ success: true, data });
  });

  update = catchAsync(async (req, res) => {
    if (!req.user?.id) {
      throw new AppError("User identity could not be resolved", 401);
    }

    const data = await markService.updateMark(
      req.params.id,
      req.tenantId,
      req.body,
      req.user.id
    );

    res.status(200).json({ success: true, data });
  });

  getScheduleSummary = catchAsync(async (req, res) => {
    const data = await markService.getScheduleMarksSummary(
      req.params.scheduleId,
      req.tenantId
    );
    res.status(200).json({ success: true, data });
  });

  getExamGroupPlan = catchAsync(async (req, res) => {
    const data = await markService.getExamGroupMarksPlan(
      req.params.examGroupId,
      req.tenantId
    );
    res.status(200).json({ success: true, data });
  });

  delete = catchAsync(async (req, res) => {
    const data = await markService.deleteMark(req.params.id, req.tenantId);
    res.status(200).json({ success: true, ...data });
  });

  getStudentResult = catchAsync(async (req, res) => {
    const data = await markService.getStudentResult(
      req.params.studentId,
      req.tenantId,
      req.query,
      req.user
    );
    res.status(200).json({ success: true, data });
  });
}