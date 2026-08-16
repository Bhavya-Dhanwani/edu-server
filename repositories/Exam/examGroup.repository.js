import { Op } from "sequelize";
import { ExamGroup, AcademicYear, GradeScale } from "../../models/index.js";
import { BaseRepository } from "../base.repository.js";

// Reusable include for populated exam group responses
const examGroupIncludes = [
  {
    model: AcademicYear,
    as: "academicYear",
    attributes: ["id", "name", "startDate", "endDate"],
  },
  {
    model: GradeScale,
    as: "gradingScheme",
    attributes: ["id", "name", "scaleType", "isDefault"],
  },
];

export class ExamGroupRepository extends BaseRepository {
  constructor() {
    super(ExamGroup);
  }

  async findByName(name, academicYearId, tenantId) {
    if (!name) return null;
    const where = {
      name: { [Op.iLike]: name.trim() },
      tenantId,
    };
    if (academicYearId) {
      where.academicYearId = academicYearId;
    }
    return await this.model.findOne({ where });
  }

  async findByAcademicYear(academicYearId, tenantId) {
    return await this.model.findAll({
      where: { academicYearId, tenantId },
      order: [["startDate", "ASC"]],
      include: examGroupIncludes,
    });
  }

  async findByIdPopulated(id, tenantId) {
    return await this.model.findOne({
      where: { id, tenantId },
      include: examGroupIncludes,
    });
  }

  async findWithPagination(tenantId, filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { academicYearId, ...restFilters } = filters;
    const where = { tenantId, ...restFilters };
    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    const includes = examGroupIncludes.map((inc) => {
      if (inc.as === "academicYear") {
        return {
          ...inc,
          where: academicYearId ? { id: academicYearId } : { isCurrent: true },
          required: true,
        };
      }
      return inc;
    });

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

  async setResultPublished(id, tenantId, value) {
    return await this.model.update(
      { isResultPublished: value },
      { where: { id, tenantId } }
    );
  }
}