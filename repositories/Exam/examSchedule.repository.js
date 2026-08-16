import { Op } from "sequelize";
import { ExamSchedule, ExamGroup, SubjectMaster, Section, Class, AcademicYear } from "../../models/index.js";
import { BaseRepository } from "../base.repository.js";

// Reusable include for fully populated schedule responses
const scheduleIncludes = [
  {
    model: ExamGroup,
    as: "examGroup",
    attributes: ["id", "name", "examType", "startDate", "endDate", "isResultPublished"],
  },
  {
    model: SubjectMaster,
    as: "subject",
    attributes: ["id", "name"],
  },
  {
    model: Section,
    as: "section",
    attributes: ["id", "name"],
    include: [
      {
        model: Class,
        as: "class",
        attributes: ["id", "name"],
      },
      {
        model: AcademicYear,
        as: "academicYear",
        attributes: ["id", "name", "startDate", "endDate"],
      },
    ],
  },
];

export class ExamScheduleRepository extends BaseRepository {
  constructor() {
    super(ExamSchedule);
  }

  async findByExamGroup(examGroupId, tenantId) {
    return await this.model.findAll({
      where: { examGroupId, tenantId },
      order: [["examDate", "ASC"]],
      include: scheduleIncludes,
    });
  }

  async findConflict(sectionId, subjectId, examDate, assessmentType = null, tenantId = null, excludeId = null) {
    const targetTenantId = tenantId || (typeof assessmentType === "string" && !["theory", "practical", "viva", "internal", "external", "other"].includes(assessmentType) ? assessmentType : null);
    const where = { sectionId, subjectId, examDate };
    if (targetTenantId) where.tenantId = targetTenantId;
    if (assessmentType && ["theory", "practical", "viva", "internal", "external", "other"].includes(assessmentType)) {
      where.assessmentType = assessmentType;
    }
    if (excludeId) where.id = { [Op.ne]: excludeId };
    return await this.model.findOne({ where });
  }

  async findByIdPopulated(id, tenantId) {
    return await this.model.findOne({
      where: { id, tenantId },
      include: scheduleIncludes,
    });
  }

  async findWithPagination(tenantId, filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { academicYearId, search, page: _p, limit: _l, ...restFilters } = filters;
    const where = { tenantId, ...restFilters };

    const keyword = String(search ?? "").trim();
    if (keyword) {
      const term = `%${keyword}%`;
      const compactTerm = `%${keyword.replace(/[\s-]/g, "")}%`;
      const seq = this.model.sequelize;
      where[Op.or] = [
        seq.where(seq.cast(seq.col("ExamSchedule.assessment_type"), "text"), Op.iLike, term),
        seq.where(seq.col("subject.name"), Op.iLike, term),
        seq.where(seq.col("section.name"), Op.iLike, term),
        seq.where(seq.col("section->class.name"), Op.iLike, term),
        seq.where(
          seq.fn("CONCAT", seq.col("section->class.name"), "-", seq.col("section.name")),
          Op.iLike,
          term
        ),
        seq.where(
          seq.fn("CONCAT", seq.col("section->class.name"), " ", seq.col("section.name")),
          Op.iLike,
          term
        ),
        seq.where(
          seq.fn(
            "REPLACE",
            seq.fn("CONCAT", seq.col("section->class.name"), seq.col("section.name")),
            " ",
            ""
          ),
          Op.iLike,
          compactTerm
        ),
      ];
    }

    const includes = scheduleIncludes.map((inc) => {
      if (inc.as === "examGroup") {
        return {
          ...inc,
          include: [
            {
              model: AcademicYear,
              as: "academicYear",
              where: academicYearId ? { id: academicYearId } : { isCurrent: true },
              required: true,
            },
          ],
        };
      }
      return inc;
    });

    const { count, rows } = await this.model.findAndCountAll({
      where,
      offset,
      limit,
      order: [["examDate", "ASC"]],
      include: includes,
      distinct: true,
      subQuery: keyword ? false : undefined,
    });

    return {
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
      data: rows,
    };
  }
}