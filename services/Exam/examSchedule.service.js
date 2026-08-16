import { ExamGroupRepository } from "../../repositories/Exam/examGroup.repository.js";
import { ExamScheduleRepository } from "../../repositories/Exam/examSchedule.repository.js";
import { AppError } from "../../utils/AppError.js";

const examScheduleRepo = new ExamScheduleRepository();
const examGroupRepo = new ExamGroupRepository();

export class ExamScheduleService {
  async createExamSchedule(tenantId, payload) {
    const { examGroupId, subjectId, sectionId, sectionIds, examDate, startTime, endTime, maxMarks, passingMarks } = payload;

    const targetSectionIds = Array.isArray(sectionIds)
      ? sectionIds
      : Array.isArray(sectionId)
      ? sectionId
      : sectionId
      ? [sectionId]
      : [];

    if (targetSectionIds.length === 0) {
      throw new AppError("At least one section must be specified", 400);
    }

    const examGroup = await examGroupRepo.findById(examGroupId, tenantId);
    if (!examGroup) throw new AppError("Exam group not found", 404);

    if (examGroup.isResultPublished) {
      throw new AppError("Cannot add schedules to a published exam group", 400);
    }

    if (examGroup.startDate && examDate < examGroup.startDate) {
      throw new AppError(
        `Exam date (${examDate}) cannot be before the exam group start date (${examGroup.startDate})`,
        400
      );
    }

    if (examGroup.endDate && examDate > examGroup.endDate) {
      throw new AppError(
        `Exam date (${examDate}) cannot be after the exam group end date (${examGroup.endDate})`,
        400
      );
    }

    if (parseInt(passingMarks) >= parseInt(maxMarks)) {
      throw new AppError("passingMarks must be less than maxMarks", 400);
    }

    if (startTime && endTime && startTime >= endTime) {
      throw new AppError("endTime must be after startTime", 400);
    }

    const results = [];
    const conflicts = [];

    for (const sId of targetSectionIds) {
      const conflict = await examScheduleRepo.findConflict(sId, subjectId, examDate, tenantId);
      if (conflict) {
        conflicts.push(sId);
        continue;
      }

      const schedule = await examScheduleRepo.create({
        tenantId,
        examGroupId,
        subjectId,
        sectionId: sId,
        examDate,
        startTime: startTime || null,
        endTime: endTime || null,
        maxMarks: parseInt(maxMarks),
        passingMarks: parseInt(passingMarks),
      });

      const populated = await examScheduleRepo.findByIdPopulated(schedule.id, tenantId);
      results.push(this.formatResponse(populated));
    }

    if (results.length === 0 && conflicts.length > 0) {
      throw new AppError("A schedule for this subject on this date already exists for the selected section(s)", 400);
    }

    return results.length === 1 ? results[0] : results;
  }

  async getAllExamSchedules(tenantId, query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;

    const filters = {};
    if (query.examGroupId) filters.examGroupId = query.examGroupId;
    if (query.subjectId) filters.subjectId = query.subjectId;
    if (query.sectionId) filters.sectionId = query.sectionId;
    if (query.examDate) filters.examDate = query.examDate;

    return await examScheduleRepo.findWithPagination(tenantId, filters, page, limit);
  }

  async getExamScheduleById(id, tenantId) {
    const schedule = await examScheduleRepo.findByIdPopulated(id, tenantId);
    if (!schedule) throw new AppError("Exam schedule not found", 404);
    return this.formatResponse(schedule);
  }

  async updateExamSchedule(id, tenantId, updateData) {
    const schedule = await examScheduleRepo.findById(id, tenantId);
    if (!schedule) throw new AppError("Exam schedule not found", 404);

    const targetExamGroupId = updateData.examGroupId || schedule.examGroupId;
    const examGroup = await examGroupRepo.findById(targetExamGroupId, tenantId);
    if (examGroup) {
      const targetExamDate = updateData.examDate || schedule.examDate;
      if (examGroup.startDate && targetExamDate < examGroup.startDate) {
        throw new AppError(
          `Exam date (${targetExamDate}) cannot be before the exam group start date (${examGroup.startDate})`,
          400
        );
      }
      if (examGroup.endDate && targetExamDate > examGroup.endDate) {
        throw new AppError(
          `Exam date (${targetExamDate}) cannot be after the exam group end date (${examGroup.endDate})`,
          400
        );
      }
    }

    const maxMarks = updateData.maxMarks !== undefined ? parseInt(updateData.maxMarks) : schedule.maxMarks;
    const passingMarks = updateData.passingMarks !== undefined ? parseInt(updateData.passingMarks) : schedule.passingMarks;

    if (passingMarks >= maxMarks) {
      throw new AppError("passingMarks must be less than maxMarks", 400);
    }

    if (updateData.startTime && updateData.endTime && updateData.startTime >= updateData.endTime) {
      throw new AppError("endTime must be after startTime", 400);
    }

    if (updateData.examDate || updateData.sectionId || updateData.subjectId) {
      const conflict = await examScheduleRepo.findConflict(
        updateData.sectionId || schedule.sectionId,
        updateData.subjectId || schedule.subjectId,
        updateData.examDate || schedule.examDate,
        tenantId,
        id
      );
      if (conflict) {
        throw new AppError("A schedule for this subject and section on this date already exists", 400);
      }
    }

    await examScheduleRepo.update(id, tenantId, {
      ...(updateData.examGroupId !== undefined ? { examGroupId: updateData.examGroupId } : {}),
      ...(updateData.subjectId !== undefined ? { subjectId: updateData.subjectId } : {}),
      ...(updateData.sectionId !== undefined ? { sectionId: updateData.sectionId } : {}),
      ...(updateData.examDate !== undefined ? { examDate: updateData.examDate } : {}),
      ...(updateData.startTime !== undefined ? { startTime: updateData.startTime } : {}),
      ...(updateData.endTime !== undefined ? { endTime: updateData.endTime } : {}),
      ...(updateData.maxMarks !== undefined ? { maxMarks: parseInt(updateData.maxMarks) } : {}),
      ...(updateData.passingMarks !== undefined ? { passingMarks: parseInt(updateData.passingMarks) } : {}),
    });

    const updated = await examScheduleRepo.findByIdPopulated(id, tenantId);
    return this.formatResponse(updated);
  }

  async deleteExamSchedule(id, tenantId) {
    const schedule = await examScheduleRepo.findByIdPopulated(id, tenantId);
    if (!schedule) throw new AppError("Exam schedule not found", 404);

    await examScheduleRepo.delete(id, tenantId);
    return {
      message: "Exam schedule deleted successfully",
      data: this.formatResponse(schedule),
    };
  }

  formatResponse(schedule) {
    return {
      id: schedule.id,
      tenantId: schedule.tenantId,
      examGroup: schedule.examGroup
        ? {
            id: schedule.examGroup.id,
            name: schedule.examGroup.name,
            examType: schedule.examGroup.examType,
            startDate: schedule.examGroup.startDate,
            endDate: schedule.examGroup.endDate,
            isResultPublished: schedule.examGroup.isResultPublished,
          }
        : { id: schedule.examGroupId },
      subject: schedule.subject || { id: schedule.subjectId },
      section: schedule.section
        ? {
            id: schedule.section.id,
            name: schedule.section.name,
            class: schedule.section.class || null,
            academicYear: schedule.section.academicYear || null,
          }
        : { id: schedule.sectionId },
      examDate: schedule.examDate,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      maxMarks: schedule.maxMarks,
      passingMarks: schedule.passingMarks,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    };
  }
}