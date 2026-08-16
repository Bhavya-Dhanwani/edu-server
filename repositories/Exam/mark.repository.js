import { Op } from "sequelize";
import { Mark, Student, User, ExamSchedule, SubjectMaster, Section, Class, ExamGroup, AcademicYear } from "../../models/index.js";
import { BaseRepository } from "../base.repository.js";

// Lightweight includes for list endpoints
const markIncludesLight = [
  {
    model: Student,
    as: "student",
    attributes: ["id", "firstName", "middleName", "lastName", "admissionNumber", "rollNumber"],
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "email"],
      },
    ],
  },
  {
    model: ExamSchedule,
    as: "examSchedule",
    attributes: ["id", "examDate", "startTime", "endTime", "maxMarks", "passingMarks"],
    include: [
      {
        model: SubjectMaster,
        as: "subject",
        attributes: ["id", "name"],
      },
      {
        model: Section,
        as: "section",
        attributes: ["id", "name"],
      },
    ],
  },
  {
    model: User,
    as: "enteredBy",
    attributes: ["id", "firstName", "lastName", "email"],
  },
];

// Full includes for detail endpoints
const markIncludesFull = [
  {
    model: Student,
    as: "student",
    attributes: ["id", "firstName", "middleName", "lastName", "admissionNumber", "rollNumber"],
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "email"],
      },
    ],
  },
  {
    model: ExamSchedule,
    as: "examSchedule",
    attributes: ["id", "examDate", "startTime", "endTime", "maxMarks", "passingMarks"],
    include: [
      {
        model: SubjectMaster,
        as: "subject",
        attributes: ["id", "name"],
      },
      {
        model: Section,
        as: "section",
        attributes: ["id", "name"],
      },
    ],
  },
  {
    model: User,
    as: "enteredBy",
    attributes: ["id", "firstName", "lastName", "email"],
  },
];

export class MarkRepository extends BaseRepository {
  constructor() {
    super(Mark);
  }

  async findByStudentAndSchedule(studentId, examScheduleId, tenantId) {
    return await this.model.findOne({
      where: { studentId, examScheduleId, tenantId },
      attributes: ["id"],
    });
  }

  async findByExamSchedule(examScheduleId, tenantId) {
    return await this.model.findAll({
      where: { examScheduleId, tenantId },
      include: markIncludesLight,
      order: [["createdAt", "DESC"]],
    });
  }

  async findByStudent(studentId, tenantId) {
    return await this.model.findAll({
      where: { studentId, tenantId },
      include: markIncludesLight,
      order: [["createdAt", "DESC"]],
    });
  }

  /**
   * Batch fetch multiple marks by studentId & examScheduleId pairs (transaction-safe)
   */
  async findByKeysBatch(keys, tenantId, transaction = null) {
    if (!keys || keys.length === 0) return [];
    return await this.model.findAll({
      where: {
        tenantId,
        [Op.or]: keys.map((k) => ({
          studentId: k.studentId,
          examScheduleId: k.examScheduleId,
        })),
      },
      transaction,
      include: markIncludesLight,
      order: [["createdAt", "DESC"]],
    });
  }

  /**
   * Batch fetch multiple marks by IDs (efficient for bulk operations)
   * Uses separate: true to prevent N+1 queries
   * Fetches in single query with efficient include strategy
   */
  async findByIdsBatch(ids, tenantId) {
    if (!ids || ids.length === 0) return [];
    return await this.model.findAll({
      where: { id: ids, tenantId },
      include: markIncludesLight,
      order: [["createdAt", "DESC"]],
    });
  }

  /**
   * Bulk upsert marks.
   * @param {Array} records  - The mark records to upsert
   * @param {object} options - Sequelize options (transaction, etc.)
   * @param {boolean} allowOverwrite - If false, throw error when existing record found
   */
  async bulkUpsert(records, options = {}, allowOverwrite = false) {
    const { transaction, tenantId } = options;

    if (!allowOverwrite) {
      // Check for any existing marks that would be silently overwritten
      const keys = records.map((r) => ({
        studentId: r.studentId,
        examScheduleId: r.examScheduleId,
      }));

      const existing = await this.model.findAll({
        where: {
          tenantId,
          [Op.or]: keys.map((k) => ({
            studentId: k.studentId,
            examScheduleId: k.examScheduleId,
          })),
        },
        transaction,
        attributes: ["studentId", "examScheduleId"],
      });

      if (existing.length > 0) {
        const conflicts = existing.map(
          (e) => `studentId=${e.studentId} / scheduleId=${e.examScheduleId}`
        );
        throw Object.assign(
          new Error(
            `${existing.length} mark(s) already exist and overwrite is disabled: ${conflicts.join("; ")}`
          ),
          { statusCode: 409, isOperational: true }
        );
      }

      // No conflicts — plain bulk insert
      return await this.model.bulkCreate(records, { transaction });
    }

    // allowOverwrite=true — upsert existing records
    return await this.model.bulkCreate(records, {
      updateOnDuplicate: ["marksObtainedRaw", "isAbsent", "enteredById", "updatedAt"],
      transaction,
    });
  }

  async findWithPagination(tenantId, filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { academicYearId, ...restFilters } = filters;
    const where = { tenantId, ...restFilters };

    const includes = markIncludesLight.map((inc) => {
      if (inc.as === "examSchedule") {
        return {
          ...inc,
          include: [
            ...(inc.include || []),
            {
              model: ExamGroup,
              as: "examGroup",
              include: [
                {
                  model: AcademicYear,
                  as: "academicYear",
                  where: academicYearId ? { id: academicYearId } : { isCurrent: true },
                  required: true,
                },
              ],
              required: true,
            },
          ],
          required: true,
        };
      }
      return inc;
    });

    // Use lightweight includes for pagination to prevent N+1
    const { count, rows } = await this.model.findAndCountAll({
      where,
      offset,
      limit,
      order: [["createdAt", "DESC"]],
      include: includes,
      distinct: true,
    });

    return {
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
      data: rows,
    };
  }

  async findByIdPopulated(id, tenantId) {
    // Use full includes for detail endpoint
    return await this.model.findOne({
      where: { id, tenantId },
      include: markIncludesFull,
    });
  }

  /**
   * Structured student results query with ExamGroup, Schedule, Subject, Section, and AcademicYear
   */
  async findStudentResults(studentId, tenantId, filters = {}) {
    const { academicYearId, classId, examGroupId, requirePublished = false, allYears = false } = filters;

    const examGroupWhere = {};
    if (requirePublished) {
      examGroupWhere.isResultPublished = true;
    }
    if (examGroupId) {
      examGroupWhere.id = examGroupId;
    }

    const academicYearWhere = {};
    if (academicYearId) {
      academicYearWhere.id = academicYearId;
    } else if (!allYears) {
      academicYearWhere.isCurrent = true;
    }

    const sectionWhere = {};
    if (classId) {
      sectionWhere.classId = classId;
    }

    return await this.model.findAll({
      where: { studentId, tenantId },
      include: [
        {
          model: Student,
          as: "student",
          attributes: ["id", "firstName", "middleName", "lastName", "admissionNumber", "rollNumber"],
        },
        {
          model: ExamSchedule,
          as: "examSchedule",
          include: [
            {
              model: SubjectMaster,
              as: "subject",
              attributes: ["id", "name"],
            },
            {
              model: Section,
              as: "section",
              where: Object.keys(sectionWhere).length > 0 ? sectionWhere : undefined,
              include: [
                {
                  model: Class,
                  as: "class",
                  attributes: ["id", "name"],
                },
              ],
            },
            {
              model: ExamGroup,
              as: "examGroup",
              where: Object.keys(examGroupWhere).length > 0 ? examGroupWhere : undefined,
              required: true,
              include: [
                {
                  model: AcademicYear,
                  as: "academicYear",
                  where: Object.keys(academicYearWhere).length > 0 ? academicYearWhere : undefined,
                  required: true,
                },
              ],
            },
          ],
          required: true,
        },
      ],
      order: [
        [{ model: ExamSchedule, as: "examSchedule" }, "examDate", "ASC"],
      ],
    });
  }
}