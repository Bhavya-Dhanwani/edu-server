import { AttendanceRepository } from "../repositories/attendance.repository.js";
import { StudentRepository } from "../repositories/student.repository.js";
import { SectionRepository } from "../repositories/Academic/section.repository.js";
import { AcademicYearRepository } from "../repositories/Academic/academicYear.repository.js";
import { AppError } from "../utils/AppError.js";
import sequelize from "../config/db.js";
import { BaseService } from "./base.service.js";
import { Op } from "sequelize";

const attendanceRepo = new AttendanceRepository();
const studentRepo = new StudentRepository();
const sectionRepo = new SectionRepository();
const academicYearRepo = new AcademicYearRepository();

export class AttendanceService extends BaseService {
  constructor() {
    super(attendanceRepo);
  }

  /**
   * CREATE ATTENDANCE: Mark student attendance
   */
  async createAttendance(tenantId, payload) {
    const {
      studentId,
      sectionId,
      academicYearId,
      date,
      status,
      inTime,
      outTime,
      markedById,
      remarks,
    } = payload;

    // Validate required fields
    if (!studentId) throw new AppError("Student ID is required", 400);
    if (!sectionId) throw new AppError("Section ID is required", 400);
    if (!academicYearId) throw new AppError("Academic Year ID is required", 400);
    if (!date) throw new AppError("Date is required", 400);
    if (!status) throw new AppError("Status is required", 400);

    // Validate student exists
    const student = await studentRepo.findById(studentId, tenantId);
    if (!student) throw new AppError("Student not found", 404);

    // Validate section exists
    const section = await sectionRepo.findById(sectionId, tenantId);
    if (!section) throw new AppError("Section not found", 404);

    // Validate academic year exists
    const academicYear = await academicYearRepo.findById(academicYearId, tenantId);
    if (!academicYear) throw new AppError("Academic Year not found", 404);

    // Check if attendance already exists for this date
    const existing = await attendanceRepo.findByStudentAndDate(studentId, date, tenantId);
    if (existing) {
      throw new AppError("Attendance already marked for this date", 400);
    }

    // Create attendance record
    const attendance = await attendanceRepo.create({
      tenantId,
      studentId,
      sectionId,
      academicYearId,
      date,
      status,
      inTime: inTime || null,
      outTime: outTime || null,
      markedById,
      markedAt: new Date(),
      remarks: remarks?.trim() || null,
    });

    const createdAttendance = await attendanceRepo.findByIdWithRelations(attendance.id, tenantId);

    return this.formatAttendanceResponse(createdAttendance);
  }

  /**
   * GET ALL ATTENDANCE: Retrieve attendance with pagination and filters
   */
  async getAllAttendance(tenantId, query) {
    const page = Number.parseInt(query.page, 10) > 0 ? Number.parseInt(query.page, 10) : 1;
    const limit = Number.parseInt(query.limit, 10) > 0 ? Number.parseInt(query.limit, 10) : 10;

    const filters = { tenantId };

    if (query.studentId) filters.studentId = query.studentId;
    if (query.sectionId) filters.sectionId = query.sectionId;
    if (query.academicYearId) filters.academicYearId = query.academicYearId;
    if (query.status) filters.status = query.status;

    // Date range filter
    if (query.startDate && query.endDate) {
      filters.date = { [Op.between]: [query.startDate, query.endDate] };
    }

    const result = await attendanceRepo.findWithPagination(tenantId, filters, page, limit);

    return {
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: result.pages,
      data: result.data.map((item) => this.formatAttendanceResponse(item)),
    };
  }

  /**
   * GET SINGLE ATTENDANCE: Get specific attendance record
   */
  async getAttendanceById(id, tenantId) {
    const attendance = await attendanceRepo.findById(id, tenantId, {
      include: attendanceRepo.getDefaultIncludes(),
    });

    if (!attendance) throw new AppError("Attendance record not found", 404);

    return this.formatAttendanceResponse(attendance);
  }

  /**
   * UPDATE ATTENDANCE: Mark correction or update attendance
   */
  async updateAttendance(id, tenantId, payload) {
    const attendance = await attendanceRepo.findById(id, tenantId, {
      include: attendanceRepo.getDefaultIncludes(),
    });

    if (!attendance) throw new AppError("Attendance record not found", 404);

    const updates = {};

    if (payload.status) updates.status = payload.status;
    if (payload.inTime !== undefined) updates.inTime = payload.inTime;
    if (payload.outTime !== undefined) updates.outTime = payload.outTime;
    if (payload.remarks !== undefined) updates.remarks = payload.remarks?.trim() || null;

    // Mark as corrected if correction data provided
    if (payload.correctionReason) {
      updates.isCorrected = true;
      updates.correctionReason = payload.correctionReason.trim();
      updates.correctedById = payload.correctedById;
    }

    const updated = await attendanceRepo.update(id, tenantId, updates);

    const refreshedAttendance = await attendanceRepo.findByIdWithRelations(id, tenantId);

    return this.formatAttendanceResponse(refreshedAttendance ?? updated);
  }

  /**
   * DELETE ATTENDANCE: Remove attendance record
   */
  async deleteAttendance(id, tenantId) {
    const attendance = await attendanceRepo.findById(id, tenantId);
    if (!attendance) throw new AppError("Attendance record not found", 404);

    await attendanceRepo.delete(id, tenantId);

    return {
      message: "Attendance record deleted successfully",
      deletedId: id,
    };
  }

  /**
   * SEARCH ATTENDANCE: Search by student name or remarks
   */
  async searchAttendance(tenantId, query) {
    const page = Number.parseInt(query.page, 10) > 0 ? Number.parseInt(query.page, 10) : 1;
    const limit = Number.parseInt(query.limit, 10) > 0 ? Number.parseInt(query.limit, 10) : 10;
    const searchTerm = query.q || query.search || "";

    if (searchTerm.length < 2) {
      throw new AppError("Search term must be at least 2 characters", 400);
    }

    const result = await attendanceRepo.searchAttendance(tenantId, searchTerm, page, limit);

    return {
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: result.pages,
      data: result.data.map((item) => this.formatAttendanceResponse(item)),
    };
  }

  /**
   * GET ATTENDANCE SUMMARY: Get attendance stats for a student
   */
  async getStudentAttendanceSummary(studentId, startDate, endDate, tenantId) {
    const student = await studentRepo.findById(studentId, tenantId);
    if (!student) throw new AppError("Student not found", 404);

    const records = await attendanceRepo.findByStudentInPeriod(
      studentId,
      startDate,
      endDate,
      tenantId
    );

    const summary = await attendanceRepo.getStudentAttendanceSummary(
      studentId,
      startDate,
      endDate,
      tenantId
    );

    const totalDays = records.length;
    const presentDays = summary.present || 0;
    const presentPercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    return {
      studentId,
      period: { startDate, endDate },
      totalDays,
      summary,
      presentPercentage: parseFloat(presentPercentage.toFixed(2)),
      records: records.map((r) => this.formatAttendanceResponse(r)),
    };
  }

  /**
   * GET SECTION ATTENDANCE SUMMARY: Get attendance stats for a section
   */
  async getSectionAttendanceSummary(sectionId, startDate, endDate, tenantId) {
    const section = await sectionRepo.findById(sectionId, tenantId);
    if (!section) throw new AppError("Section not found", 404);

    const records = await attendanceRepo.findBySectionInPeriod(
      sectionId,
      startDate,
      endDate,
      tenantId
    );

    const summary = await attendanceRepo.getSectionAttendanceSummary(
      sectionId,
      startDate,
      endDate,
      tenantId
    );

    return {
      sectionId,
      sectionName: section.name,
      period: { startDate, endDate },
      summary,
      totalRecords: records.length,
      records: records.slice(0, 20).map((r) => this.formatAttendanceResponse(r)),
    };
  }

  /**
   * GET ATTENDANCE FOR DATE: Get all attendance marked on a specific date
   */
  async getAttendanceForDate(date, tenantId, page = 1, limit = 10) {
    const filters = { date };
    const result = await attendanceRepo.findWithPagination(tenantId, filters, page, limit);

    return {
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: result.pages,
      date,
      data: result.data.map((item) => this.formatAttendanceResponse(item)),
    };
  }

  /**
   * GET UNCORRECTED ATTENDANCE: Get all attendance that needs correction
   */
  async getUncorrectedAttendance(tenantId, page = 1, limit = 10) {
    const result = await attendanceRepo.findUncorrected(tenantId, page, limit);

    return {
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: result.pages,
      data: result.data.map((item) => this.formatAttendanceResponse(item)),
    };
  }

  /**
   * BULK MARK ATTENDANCE: Mark attendance for multiple students
   */
  async bulkMarkAttendance(tenantId, payload) {
    const { records, markedById } = payload;

    if (!Array.isArray(records) || records.length === 0) {
      throw new AppError("No attendance records provided", 400);
    }

    const transaction = await sequelize.transaction();

    try {
      const createdRecords = [];
      const processedKeys = new Set();

      for (const record of records) {
        const { studentId, sectionId, academicYearId, date, status, inTime, outTime, remarks } = record;

        // Skip duplicates within the same payload
        const key = `${studentId}_${date}`;
        if (processedKeys.has(key)) continue;
        processedKeys.add(key);

        // Validate student exists
        const student = await studentRepo.findById(studentId, tenantId);
        if (!student) continue; // Skip invalid student

        // Check if attendance already exists (passing transaction)
        const existing = await attendanceRepo.findByStudentAndDate(studentId, date, tenantId, { transaction });
        if (!existing) {
          const created = await attendanceRepo.create(
            {
              tenantId,
              studentId,
              sectionId,
              academicYearId,
              date,
              status,
              inTime: inTime || null,
              outTime: outTime || null,
              markedById,
              markedAt: new Date(),
              remarks: remarks?.trim() || null,
            },
            { transaction }
          );

          createdRecords.push(created);
        }
      }

      await transaction.commit();

      const createdIds = createdRecords.map((record) => record.id);
      const populatedCreatedRecords = await attendanceRepo.findManyByIdsWithRelations(
        createdIds,
        tenantId
      );

      return {
        created: populatedCreatedRecords.length || createdRecords.length,
        total: records.length,
        data: (populatedCreatedRecords.length ? populatedCreatedRecords : createdRecords).map((r) =>
          this.formatAttendanceResponse(r)
        ),
      };
    } catch (error) {
      if (!transaction.finished) await transaction.rollback();
      throw error;
    }
  }

  /**
   * Format attendance response with populated relations
   */
  formatAttendanceResponse(attendance) {
    if (!attendance) return null;

    const formatted = {
      id: attendance.id,
      student: attendance.student
        ? {
          id: attendance.student.id,
          name: `${attendance.student.user?.firstName || ""} ${attendance.student.user?.lastName || ""}`.trim(),
          email: attendance.student.user?.email,
        }
        : null,
      section: attendance.section
        ? {
          id: attendance.section.id,
          name: attendance.section.name,
        }
        : null,
      academicYear: attendance.academicYear
        ? {
          id: attendance.academicYear.id,
          name: attendance.academicYear.name,
        }
        : null,
      date: attendance.date,
      status: attendance.status,
      inTime: attendance.inTime,
      outTime: attendance.outTime,
      markedBy: attendance.markedBy
        ? {
          id: attendance.markedBy.id,
          name: `${attendance.markedBy.firstName} ${attendance.markedBy.lastName}`,
        }
        : null,
      markedAt: attendance.markedAt,
      isCorrected: attendance.isCorrected,
      correctedBy: attendance.correctedBy
        ? {
          id: attendance.correctedBy.id,
          name: `${attendance.correctedBy.firstName} ${attendance.correctedBy.lastName}`,
        }
        : null,
      correctionReason: attendance.correctionReason,
      remarks: attendance.remarks,
      notificationSent: attendance.notificationSent,
      createdAt: attendance.createdAt,
      updatedAt: attendance.updatedAt,
    };

    return formatted;
  }
}
