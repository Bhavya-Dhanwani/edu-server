import { ExamGroupRepository } from "../../repositories/Exam/examGroup.repository.js";
import { ExamScheduleRepository } from "../../repositories/Exam/examSchedule.repository.js";
import { AppError } from "../../utils/AppError.js";

const examGroupRepo = new ExamGroupRepository();
const examScheduleRepo = new ExamScheduleRepository();

export class ExamGroupService {
  async createExamGroup(tenantId, payload) {
    const { academicYearId, name, examType, gradingSchemeId, startDate, endDate, weightagePercent } = payload;

    if (startDate && endDate) {
      if (new Date(endDate) <= new Date(startDate)) {
        throw new AppError("endDate must be after startDate", 400);
      }
    }

    const existing = await examGroupRepo.findByName(name.trim(), academicYearId, tenantId);
    console.log(existing, "this is data Existing ----")
    if (existing) {
      throw new AppError("An exam group with this name already exists in this academic session", 400);
    }

    const examGroup = await examGroupRepo.create({
      tenantId,
      academicYearId,
      name: name.trim(),
      examType,
      gradingSchemeId: gradingSchemeId || null,
      startDate: startDate || null,
      endDate: endDate || null,
      weightagePercent: weightagePercent || null,
      isResultPublished: false,
    });

    const populated = await examGroupRepo.findByIdPopulated(examGroup.id, tenantId);
    return this.formatResponse(populated);
  }

  async getAllExamGroups(tenantId, query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;

    const filters = {};
    if (query.academicYearId) filters.academicYearId = query.academicYearId;
    if (query.examType) filters.examType = query.examType;
    if (query.isResultPublished === "true") filters.isResultPublished = true;
    if (query.isResultPublished === "false") filters.isResultPublished = false;

    return await examGroupRepo.findWithPagination(tenantId, filters, page, limit);
  }

  async getExamGroupById(id, tenantId) {
    const examGroup = await examGroupRepo.findByIdPopulated(id, tenantId);
    if (!examGroup) throw new AppError("Exam group not found", 404);
    return this.formatResponse(examGroup);
  }

  async updateExamGroup(id, tenantId, updateData) {
    const examGroup = await examGroupRepo.findById(id, tenantId);
    if (!examGroup) throw new AppError("Exam group not found", 404);

    if (examGroup.isResultPublished) {
      throw new AppError("Cannot update an exam group after result is published", 400);
    }

    const newStart = updateData.startDate ?? examGroup.startDate;
    const newEnd = updateData.endDate ?? examGroup.endDate;
    if (newStart && newEnd) {
      if (new Date(newEnd) <= new Date(newStart)) {
        throw new AppError("endDate must be after startDate", 400);
      }
    }

    const yearId = updateData.academicYearId || examGroup.academicYearId;
    if (updateData.name) {
      const existing = await examGroupRepo.findByName(updateData.name.trim(), yearId, tenantId);
      if (existing && existing.id !== id) {
        throw new AppError("An exam group with this name already exists in this academic session", 400);
      }
    }

    await examGroupRepo.update(id, tenantId, {
      ...(updateData.name !== undefined ? { name: updateData.name.trim() } : {}),
      ...(updateData.examType !== undefined ? { examType: updateData.examType } : {}),
      ...(updateData.academicYearId !== undefined ? { academicYearId: updateData.academicYearId } : {}),
      ...(updateData.gradingSchemeId !== undefined ? { gradingSchemeId: updateData.gradingSchemeId } : {}),
      ...(updateData.startDate !== undefined ? { startDate: updateData.startDate } : {}),
      ...(updateData.endDate !== undefined ? { endDate: updateData.endDate } : {}),
      ...(updateData.weightagePercent !== undefined ? { weightagePercent: updateData.weightagePercent } : {}),
    });

    const updated = await examGroupRepo.findByIdPopulated(id, tenantId);
    return this.formatResponse(updated);
  }

  async deleteExamGroup(id, tenantId) {
    const examGroup = await examGroupRepo.findByIdPopulated(id, tenantId);
    if (!examGroup) throw new AppError("Exam group not found", 404);

    if (examGroup.isResultPublished) {
      throw new AppError("Cannot delete an exam group after result is published", 400);
    }

    await examGroupRepo.delete(id, tenantId);
    return {
      message: "Exam group deleted successfully",
      data: this.formatResponse(examGroup),
    };
  }

  async publishResult(id, tenantId) {
    const examGroup = await examGroupRepo.findById(id, tenantId);
    if (!examGroup) throw new AppError("Exam group not found", 404);

    if (examGroup.isResultPublished) {
      throw new AppError("Result is already published", 400);
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // Lock publishing for future exam groups
    if (examGroup.startDate && examGroup.startDate > todayStr) {
      throw new AppError(
        `Cannot publish results for a future exam group (${examGroup.name} starts on ${examGroup.startDate})`,
        400
      );
    }

    if (examGroup.endDate && examGroup.endDate > todayStr) {
      throw new AppError(
        `Cannot publish results before the exam group end date (${examGroup.endDate})`,
        400
      );
    }

    // Check if any schedules in this group are set for future dates
    const schedules = await examScheduleRepo.findByExamGroup(id, tenantId);
    const futureSchedule = schedules.find((s) => s.examDate && s.examDate > todayStr);
    if (futureSchedule) {
      throw new AppError(
        `Cannot publish results: Exam schedule on ${futureSchedule.examDate} is in the future`,
        400
      );
    }

    await examGroupRepo.setResultPublished(id, tenantId, true);
    const updated = await examGroupRepo.findByIdPopulated(id, tenantId);
    return this.formatResponse(updated);
  }

  async unpublishResult(id, tenantId) {
    const examGroup = await examGroupRepo.findById(id, tenantId);
    if (!examGroup) throw new AppError("Exam group not found", 404);

    if (!examGroup.isResultPublished) {
      throw new AppError("Result is not published yet", 400);
    }

    await examGroupRepo.setResultPublished(id, tenantId, false);
    const updated = await examGroupRepo.findByIdPopulated(id, tenantId);
    return this.formatResponse(updated);
  }

  formatResponse(examGroup) {
    return {
      id: examGroup.id,
      tenantId: examGroup.tenantId,
      academicYear: examGroup.academicYear
        ? {
          id: examGroup.academicYear.id,
          name: examGroup.academicYear.name,
          startDate: examGroup.academicYear.startDate,
          endDate: examGroup.academicYear.endDate,
        }
        : { id: examGroup.academicYearId },
      name: examGroup.name,
      examType: examGroup.examType,
      gradingScheme: examGroup.gradingScheme
        ? {
          id: examGroup.gradingScheme.id,
          name: examGroup.gradingScheme.name,
          scaleType: examGroup.gradingScheme.scaleType,
        }
        : examGroup.gradingSchemeId
          ? { id: examGroup.gradingSchemeId }
          : null,
      startDate: examGroup.startDate,
      endDate: examGroup.endDate,
      isResultPublished: examGroup.isResultPublished,
      weightagePercent: examGroup.weightagePercent,
      createdAt: examGroup.createdAt,
      updatedAt: examGroup.updatedAt,
    };
  }
}