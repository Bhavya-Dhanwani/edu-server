import { SectionService } from "../../services/Academic/section.service.js";
import { BaseController } from "../base.controller.js";
import { catchAsync } from "../../utils/catchAsync.js";

const sectionService = new SectionService();

export class SectionController extends BaseController {
  constructor() {
    super(sectionService);
  }

  // Create Section
  create = catchAsync(async (req, res) => {
    const data = await sectionService.createSection(req.tenantId, req.body);

    res.status(201).json({
      success: true,
      data,
    });
  });

  // Get All Sections (pagination + filters)
  getAll = catchAsync(async (req, res) => {
    const result = await sectionService.getAllSections(
      req.tenantId,
      req.query
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  });

  // Get Section by ID (with details)
  getOne = catchAsync(async (req, res) => {
    const data = await sectionService.getSectionById(
      req.params.id,
      req.tenantId
    );

    res.status(200).json({
      success: true,
      data,
    });
  });

  // Update Section
  update = catchAsync(async (req, res) => {
    const data = await sectionService.updateSection(
      req.params.id,
      req.tenantId,
      req.body
    );

    res.status(200).json({
      success: true,
      data,
    });
  });

  // Delete Section
  delete = catchAsync(async (req, res) => {
    const data = await sectionService.deleteSection(
      req.params.id,
      req.tenantId
    );

    res.status(200).json({
      success: true,
      ...data,
    });
  });

  // Get Section Options (for dropdowns)
  getOptions = catchAsync(async (req, res) => {
    const { classId } = req.query;
    const academicYearId = req.query.academicYearId || req.academicYearId;

    if (!classId) {
      const AppError = (await import("../../utils/AppError.js")).AppError;
      throw new AppError("classId is required", 400);
    }

    if (!academicYearId) {
      const AppError = (await import("../../utils/AppError.js")).AppError;
      throw new AppError("No active academic year found", 400);
    }

    const data = await sectionService.getSectionOptions(
      req.tenantId,
      classId,
      academicYearId
    );

    res.status(200).json({
      success: true,
      data,
    });
  });
}