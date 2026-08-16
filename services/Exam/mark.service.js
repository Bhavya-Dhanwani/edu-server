import { MarkRepository } from "../../repositories/Exam/mark.repository.js";
import { ExamScheduleRepository } from "../../repositories/Exam/examSchedule.repository.js";
import { ExamGroupRepository } from "../../repositories/Exam/examGroup.repository.js";
import { StudentRepository } from "../../repositories/student.repository.js";
import { StudentSectionEnrollmentRepository } from "../../repositories/studentSectionEnrollment.repository.js";
import { AppError } from "../../utils/AppError.js";
import sequelize from "../../config/db.js";

const markRepo = new MarkRepository();
const examScheduleRepo = new ExamScheduleRepository();
const examGroupRepo = new ExamGroupRepository();
const studentRepo = new StudentRepository();
const studentEnrollmentRepo = new StudentSectionEnrollmentRepository();

const safeParseMarks = (val) => {
  if (val === null || val === undefined || val === "") return null;
  const num = Number(val);
  if (isNaN(num)) return null;
  return Math.max(0, Math.floor(num));
};

export class MarkService {
  async createMark(tenantId, payload, enteredById) {
    const { studentId, examScheduleId, marksObtainedRaw, isAbsent } = payload;

    const schedule = await examScheduleRepo.findById(examScheduleId, tenantId);
    if (!schedule) throw new AppError("Exam schedule not found", 404);

    const todayStr = new Date().toISOString().split("T")[0];
    if (schedule.examDate && schedule.examDate > todayStr) {
      throw new AppError(
        `Cannot enter marks before the scheduled exam date (${schedule.examDate})`,
        400
      );
    }

    const student = await studentRepo.findById(studentId, tenantId);
    if (!student) throw new AppError("Student not found", 404);

    const parsedMarks = safeParseMarks(marksObtainedRaw);

    if (isAbsent === true && parsedMarks !== null) {
      throw new AppError("Cannot set marks if student is marked absent", 400);
    }

    if (!isAbsent && parsedMarks !== null) {
      if (parsedMarks > schedule.maxMarks) {
        throw new AppError("Marks cannot exceed maximum marks for this exam", 400);
      }
    }

    const existing = await markRepo.findByStudentAndSchedule(studentId, examScheduleId, tenantId);
    if (existing) {
      throw new AppError("Mark entry already exists for this student and exam schedule", 409);
    }

    const created = await markRepo.create({
      tenantId,
      studentId,
      examScheduleId,
      marksObtainedRaw: isAbsent ? null : parsedMarks,
      isAbsent: isAbsent || false,
      enteredById: enteredById || null,
    });

    // Use detail endpoint include strategy for single record
    const populated = await markRepo.findByIdPopulated(created.id, tenantId);
    return this.formatResponse(populated);
  }

  /**
   * Bulk create/upsert marks inside a transaction.
   * ARCHITECTURE: Fetch all data BEFORE commit to ensure transaction safety
   * - If any fetch fails, entire transaction is rolled back
   * - No risk of marks saved but fetch error returned to client
   * @param {string}  tenantId
   * @param {Array}   marks
   * @param {string}  enteredById
   * @param {boolean} allowOverwrite - default false; pass true to update existing records
   */
  async bulkCreateMarks(tenantId, marks, enteredById, allowOverwrite = false) {
    if (!Array.isArray(marks) || marks.length === 0) {
      throw new AppError("No mark entries provided for bulk submission", 400);
    }

    // Filter out unedited entries where isAbsent is false and marksObtainedRaw is null/empty
    const validMarks = marks.filter(
      (m) => m.isAbsent === true || safeParseMarks(m.marksObtainedRaw) !== null
    );

    if (validMarks.length === 0) {
      throw new AppError("No valid mark entries (marks entered or set absent) provided for submission", 400);
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const scheduleIds = [...new Set(validMarks.map((m) => m.examScheduleId))];

    for (const sId of scheduleIds) {
      const schedule = await examScheduleRepo.findById(sId, tenantId);
      if (schedule && schedule.examDate && schedule.examDate > todayStr) {
        throw new AppError(
          `Cannot enter or update marks before the scheduled exam date (${schedule.examDate})`,
          400
        );
      }
    }

    const transaction = await sequelize.transaction();

    try {
      const records = validMarks.map((mark) => {
        const isAbsent = Boolean(mark.isAbsent);
        const parsed = safeParseMarks(mark.marksObtainedRaw);
        return {
          tenantId,
          studentId: mark.studentId,
          examScheduleId: mark.examScheduleId,
          marksObtainedRaw: isAbsent ? null : parsed,
          isAbsent,
          enteredById: enteredById || null,
        };
      });

      // Step 1: Bulk insert/upsert within transaction
      await markRepo.bulkUpsert(
        records,
        { transaction, tenantId },
        allowOverwrite
      );

      // Step 2: Fetch populated records by studentId & examScheduleId pairs inside transaction
      const keys = records.map((r) => ({
        studentId: r.studentId,
        examScheduleId: r.examScheduleId,
      }));

      const populated = await markRepo.findByKeysBatch(keys, tenantId, transaction);

      // Step 3: Commit after safe fetch
      await transaction.commit();

      return populated.map((m) => this.formatResponse(m));
    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      throw error;
    }
  }

  async getAllMarks(tenantId, query) {
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 25, 100); // Default 25, max 100 to prevent memory issues

    const filters = {};
    if (query.studentId) filters.studentId = query.studentId;
    if (query.examScheduleId) filters.examScheduleId = query.examScheduleId;
    if (query.isAbsent === "true") filters.isAbsent = true;
    if (query.isAbsent === "false") filters.isAbsent = false;

    return await markRepo.findWithPagination(tenantId, filters, page, limit);
  }

  async getMarkById(id, tenantId) {
    const mark = await markRepo.findByIdPopulated(id, tenantId);
    if (!mark) throw new AppError("Mark not found", 404);
    return this.formatResponse(mark);
  }

  async updateMark(id, tenantId, updateData, enteredById) {
    const mark = await markRepo.findById(id, tenantId);
    if (!mark) throw new AppError("Mark not found", 404);

    const schedule = await examScheduleRepo.findById(mark.examScheduleId, tenantId);
    const todayStr = new Date().toISOString().split("T")[0];
    if (schedule && schedule.examDate && schedule.examDate > todayStr) {
      throw new AppError(
        `Cannot update marks before the scheduled exam date (${schedule.examDate})`,
        400
      );
    }

    const parsedMarks = updateData.marksObtainedRaw !== undefined ? safeParseMarks(updateData.marksObtainedRaw) : undefined;

    if (updateData.isAbsent === true && parsedMarks !== undefined && parsedMarks !== null) {
      throw new AppError("Cannot set marks if student is marked absent", 400);
    }

    if (!updateData.isAbsent && parsedMarks !== undefined && parsedMarks !== null) {
      const schedule = await examScheduleRepo.findById(mark.examScheduleId, tenantId);
      if (schedule && parsedMarks > schedule.maxMarks) {
        throw new AppError("Marks cannot exceed maximum marks for this exam", 400);
      }
    }

    const isAbsent = updateData.isAbsent;
    const marksObtainedRaw = isAbsent
      ? null
      : parsedMarks;

    // TRANSACTION SAFETY: Ensure consistency between update and fetch
    const transaction = await sequelize.transaction();
    try {
      await markRepo.update(id, tenantId, {
        ...(isAbsent !== undefined ? { isAbsent } : {}),
        ...(marksObtainedRaw !== undefined ? { marksObtainedRaw } : {}),
        ...(enteredById ? { enteredById } : {}),
      });

      const updated = await markRepo.findByIdPopulated(id, tenantId);
      await transaction.commit();
      return this.formatResponse(updated);
    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      throw error;
    }
  }

  async deleteMark(id, tenantId) {
    // TRANSACTION SAFETY: Fetch and delete within same transaction
    const transaction = await sequelize.transaction();
    try {
      const mark = await markRepo.findByIdPopulated(id, tenantId);
      if (!mark) throw new AppError("Mark not found", 404);

      await markRepo.delete(id, tenantId);
      await transaction.commit();
      
      return {
        message: "Mark deleted successfully",
        data: this.formatResponse(mark),
      };
    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      throw error;
    }
  }

  formatResponse(mark) {
    return {
      id: mark.id,
      tenantId: mark.tenantId,
      student: mark.student
        ? {
            id: mark.student.id,
            firstName: mark.student.firstName,
            middleName: mark.student.middleName,
            lastName: mark.student.lastName,
            admissionNumber: mark.student.admissionNumber,
            rollNumber: mark.student.rollNumber,
            email: mark.student.user?.email || null,
          }
        : { id: mark.studentId },
      examSchedule: mark.examSchedule
        ? {
            id: mark.examSchedule.id,
            examDate: mark.examSchedule.examDate,
            startTime: mark.examSchedule.startTime,
            endTime: mark.examSchedule.endTime,
            maxMarks: mark.examSchedule.maxMarks,
            passingMarks: mark.examSchedule.passingMarks,
            subject: mark.examSchedule.subject || null,
            section: mark.examSchedule.section || null,
          }
        : { id: mark.examScheduleId },
      marksObtainedRaw: mark.marksObtainedRaw,
      isAbsent: mark.isAbsent,
      enteredBy: mark.enteredBy
        ? {
            id: mark.enteredBy.id,
            firstName: mark.enteredBy.firstName,
            lastName: mark.enteredBy.lastName,
            email: mark.enteredBy.email,
          }
        : mark.enteredById
        ? { id: mark.enteredById }
        : null,
      createdAt: mark.createdAt,
      updatedAt: mark.updatedAt,
    };
  }

  async getScheduleMarksSummary(scheduleId, tenantId) {
    const schedule = await examScheduleRepo.findByIdPopulated(scheduleId, tenantId);
    if (!schedule) throw new AppError("Exam schedule not found", 404);

    const markRecords = await markRepo.findByExamSchedule(scheduleId, tenantId);
    const marks = markRecords.map((m) => this.formatResponse(m));

    // Calculate total enrolled section students
    let totalStudents = marks.length;
    if (schedule.sectionId) {
      const sectionEnrollmentCount = await studentEnrollmentRepo.countBySection(schedule.sectionId, tenantId);
      if (sectionEnrollmentCount > 0) {
        totalStudents = sectionEnrollmentCount;
      }
    }

    const marksCompleted = marks.length;
    const marksPending = Math.max(0, totalStudents - marksCompleted);
    const evaluatedCount = marksCompleted;

    const absentCount = marks.filter((m) => m.isAbsent).length;
    const presentCount = Math.max(0, marksCompleted - absentCount);
    const presentMarks = marks.filter(
      (m) => !m.isAbsent && m.marksObtainedRaw !== null && m.marksObtainedRaw !== undefined
    );

    const passingMarks = schedule.passingMarks || 40;
    const passedCount = presentMarks.filter(
      (m) => (m.marksObtainedRaw ?? 0) >= passingMarks
    ).length;
    const failedCount = presentMarks.length - passedCount;

    const scores = presentMarks.map((m) => m.marksObtainedRaw);
    const highestMarks = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestMarks = scores.length > 0 ? Math.min(...scores) : 0;
    const averageMarks =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    const passPercentage =
      presentMarks.length > 0
        ? Math.round((passedCount / presentMarks.length) * 100)
        : 0;

    return {
      schedule,
      totalStudents,
      evaluatedCount,
      marksCompleted,
      marksPending,
      presentCount,
      absentCount,
      passedCount,
      failedCount,
      highestMarks,
      lowestMarks,
      averageMarks,
      passPercentage,
      marks,
    };
  }

  async getExamGroupMarksPlan(examGroupId, tenantId) {
    const examGroup = await examGroupRepo.findByIdPopulated(examGroupId, tenantId);
    if (!examGroup) throw new AppError("Exam group not found", 404);

    const scheduleRecords = await examScheduleRepo.findByExamGroup(examGroupId, tenantId);

    let totalEvaluatedStudents = 0;
    let totalMaxMarks = 0;
    let totalPassedAll = 0;
    let totalEvaluatedAll = 0;

    const schedules = await Promise.all(
      scheduleRecords.map(async (s) => {
        const markRecords = await markRepo.findByExamSchedule(s.id, tenantId);
        const marksCount = markRecords.length;
        const presentMarks = markRecords.filter((m) => !m.isAbsent && m.marksObtainedRaw !== null);
        const passCount = presentMarks.filter((m) => m.marksObtainedRaw >= s.passingMarks).length;
        const failCount = presentMarks.length - passCount;

        totalMaxMarks += s.maxMarks || 0;
        totalEvaluatedStudents += marksCount;
        totalPassedAll += passCount;
        totalEvaluatedAll += presentMarks.length;

        const completionPercentage = marksCount > 0 ? 100 : 0;

        return {
          ...s.toJSON(),
          marksCount,
          passCount,
          failCount,
          completionPercentage,
        };
      })
    );

    const schedulesCount = schedules.length;
    const completionPercentage =
      schedulesCount > 0
        ? Math.round(schedules.reduce((acc, curr) => acc + curr.completionPercentage, 0) / schedulesCount)
        : 0;

    const overallPassRate =
      totalEvaluatedAll > 0 ? Math.round((totalPassedAll / totalEvaluatedAll) * 100) : 0;

    return {
      id: examGroupId,
      examGroup,
      schedulesCount,
      totalMaxMarks,
      totalEvaluatedStudents,
      totalEnrolledStudents: totalEvaluatedStudents,
      overallPassRate,
      completionPercentage,
      schedules,
    };
  }

  /**
   * Get student exam results and report cards with security publication checks and authorization scoping
   */
  async getStudentResult(studentId, tenantId, query = {}, userContext = {}) {
    const student = await studentRepo.findById(studentId, tenantId);
    if (!student) {
      throw new AppError("Student not found", 404);
    }

    // Security Ownership Check:
    // If request is from a student user, verify ownership
    const isStaffOrAdmin =
      userContext.role === "admin" ||
      userContext.role === "staff" ||
      userContext.role === "super_admin" ||
      (Array.isArray(userContext.permissions) && userContext.permissions.includes("read:exams"));

    if (!isStaffOrAdmin) {
      const authenticatedStudentId = userContext.studentId || userContext.student?.id;
      if (authenticatedStudentId && authenticatedStudentId !== studentId) {
        throw new AppError("Access denied: You can only view your own exam results", 403);
      }
    }

    // Non-staff users can ONLY view published results (isResultPublished = true)
    const requirePublished = !isStaffOrAdmin;

    const academicYearId = query.academicYearId || undefined;
    const classId = query.classId || undefined;
    const examGroupId = query.examGroupId || undefined;
    const allYears = query.allYears === "true" || query.allYears === true;

    const markRecords = await markRepo.findStudentResults(studentId, tenantId, {
      academicYearId,
      classId,
      examGroupId,
      requirePublished,
      allYears,
    });

    if (!markRecords || markRecords.length === 0) {
      return {
        student: {
          id: student.id,
          firstName: student.firstName,
          middleName: student.middleName,
          lastName: student.lastName,
          admissionNumber: student.admissionNumber,
          rollNumber: student.rollNumber,
        },
        summary: {
          totalExamsCount: 0,
          evaluatedCount: 0,
          totalMaxMarks: 0,
          totalObtainedMarks: 0,
          percentage: 0,
          overallStatus: "N/A",
        },
        examGroups: [],
      };
    }

    // Group marks by ExamGroup
    const groupMap = new Map();

    for (const record of markRecords) {
      const schedule = record.examSchedule;
      const group = schedule?.examGroup;
      if (!group) continue;

      const groupId = group.id;
      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, {
          id: group.id,
          name: group.name,
          examType: group.examType,
          isResultPublished: group.isResultPublished,
          academicYear: group.academicYear
            ? {
                id: group.academicYear.id,
                name: group.academicYear.name,
                isCurrent: group.academicYear.isCurrent,
              }
            : null,
          classSection: schedule.section
            ? {
                classId: schedule.section.class?.id,
                className: schedule.section.class?.name,
                sectionId: schedule.section.id,
                sectionName: schedule.section.name,
              }
            : null,
          schedules: [],
        });
      }

      const grp = groupMap.get(groupId);
      const isAbsent = Boolean(record.isAbsent);
      const marksObtained = isAbsent || record.marksObtainedRaw === null ? 0 : Number(record.marksObtainedRaw);
      const maxMarks = schedule.maxMarks || 100;
      const passingMarks = schedule.passingMarks || 40;
      const status = isAbsent ? "ABSENT" : marksObtained >= passingMarks ? "PASS" : "FAIL";

      grp.schedules.push({
        markId: record.id,
        scheduleId: schedule.id,
        subject: schedule.subject
          ? {
              id: schedule.subject.id,
              name: schedule.subject.name,
              code: schedule.subject.code || undefined,
            }
          : null,
        assessmentType: schedule.assessmentType,
        examDate: schedule.examDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        maxMarks,
        passingMarks,
        marksObtained: isAbsent ? null : marksObtained,
        isAbsent,
        status,
        percentage: isAbsent ? 0 : Math.round((marksObtained / maxMarks) * 100),
      });
    }

    let overallMaxMarks = 0;
    let overallObtainedMarks = 0;
    let overallExamsCount = 0;
    let overallPassedCount = 0;

    const examGroups = Array.from(groupMap.values()).map((grp) => {
      let groupMax = 0;
      let groupObtained = 0;
      let groupPassed = 0;

      grp.schedules.forEach((s) => {
        groupMax += s.maxMarks;
        if (!s.isAbsent) {
          groupObtained += s.marksObtained || 0;
          if (s.status === "PASS") groupPassed++;
        }
      });

      overallMaxMarks += groupMax;
      overallObtainedMarks += groupObtained;
      overallExamsCount += grp.schedules.length;
      overallPassedCount += groupPassed;

      const groupPercentage = groupMax > 0 ? Math.round((groupObtained / groupMax) * 100 * 100) / 100 : 0;
      const groupOverallStatus = grp.schedules.some((s) => s.status === "FAIL" || s.status === "ABSENT")
        ? "FAIL"
        : "PASS";

      return {
        ...grp,
        summary: {
          totalMaxMarks: groupMax,
          totalObtainedMarks: groupObtained,
          percentage: groupPercentage,
          overallStatus: groupOverallStatus,
        },
      };
    });

    const overallPercentage = overallMaxMarks > 0 ? Math.round((overallObtainedMarks / overallMaxMarks) * 100 * 100) / 100 : 0;
    const overallStatus = examGroups.some((g) => g.summary.overallStatus === "FAIL") ? "FAIL" : "PASS";

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        middleName: student.middleName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        rollNumber: student.rollNumber,
      },
      summary: {
        totalExamsCount: overallExamsCount,
        evaluatedCount: overallExamsCount,
        totalMaxMarks: overallMaxMarks,
        totalObtainedMarks: overallObtainedMarks,
        percentage: overallPercentage,
        overallStatus,
      },
      examGroups,
    };
  }
}