import { Op } from "sequelize";
import { AcademicYear, Class, Section, User } from "../../models/index.js";
import { BaseRepository } from "../base.repository.js";

export class SectionRepository extends BaseRepository {
  constructor() {
    super(Section);
  }

  // Duplicate check (active records only, case-insensitive)
  async findDuplicate(name, classId, academicYearId, tenantId) {
    return await this.model.findOne({
      where: {
        name: {
          [Op.iLike]: name.trim(),
        },
        classId,
        academicYearId,
        tenantId,
        deletedAt: null,
      },
    });
  }

  // Find sections by class
  async findByClass(classId, tenantId) {
    return await this.model.findAll({
      where: { classId, tenantId, deletedAt: null },
      order: [["name", "ASC"]],
    });
  }

  // Find sections by academic year
  async findByAcademicYear(academicYearId, tenantId) {
    return await this.model.findAll({
      where: { academicYearId, tenantId, deletedAt: null },
      order: [["name", "ASC"]],
    });
  }

  // Pagination + filters
  async findWithPagination(tenantId, filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { academicYearId, ...restFilters } = filters;

    const where = {
      tenantId,
      deletedAt: null,
      ...restFilters,
    };
    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    const { count, rows } = await this.model.findAndCountAll({
      where,
      offset,
      limit,
      order: [["name", "ASC"]],
      include: [
        {
          model: Class,
          as: "class",
          attributes: ["id", "name", "numericLevel", "description"],
        },
        {
          model: AcademicYear,
          as: "academicYear",
          attributes: ["id", "name", "startDate", "endDate", "isCurrent", "isLocked"],
          where: academicYearId ? { id: academicYearId } : { isCurrent: true },
          required: true,
        },
        {
          model: User,
          as: "classTeacher",
          attributes: ["id", "firstName", "lastName", "email", "phone", "status"],
          required: false,
        },
      ],
    });

    return {
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
      data: rows,
    };
  }

  // Get single section with full details
  async findWithDetails(id, tenantId) {
    return await this.model.findOne({
      where: { id, tenantId, deletedAt: null },
      include: [
        {
          model: Class,
          as: "class",
          attributes: ["id", "name", "numericLevel", "description", "tenantId"],
        },
        {
          model: AcademicYear,
          as: "academicYear",
          attributes: ["id", "name", "startDate", "endDate", "isCurrent", "isLocked", "tenantId"],
        },
        {
          model: User,
          as: "classTeacher",
          attributes: ["id", "firstName", "lastName", "email", "phone", "status"],
          required: false,
        },
      ],
    });
  }

  // Search section by name
  async searchByName(keyword, tenantId) {
    return await this.model.findAll({
      where: {
        tenantId,
        deletedAt: null,
        name: {
          [Op.iLike]: `%${keyword}%`,
        },
      },
      order: [["name", "ASC"]],
    });
  }

  // NEW: Get sections by class with pagination and full details
  async findByClassWithPagination(
    classId,
    tenantId,
    page = 1,
    limit = 10,
    academicYearId = null,
    search = null,
  ) {
    const offset = (page - 1) * limit;

    const where = {
      classId,
      tenantId,
      deletedAt: null,
    };

    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    if (search) {
      where.name = {
        [Op.iLike]: `%${String(search).trim()}%`,
      };
    }

    const { count, rows } = await this.model.findAndCountAll({
      where,
      offset,
      limit,
      order: [["name", "ASC"]],
      include: [
        {
          model: AcademicYear,
          as: "academicYear",
          attributes: ["id", "name", "startDate", "endDate", "isCurrent", "isLocked", "tenantId"],
          where: academicYearId ? { id: academicYearId } : { isCurrent: true },
          required: true,
        },
        {
          model: User,
          as: "classTeacher",
          attributes: ["id", "firstName", "lastName", "email", "phone", "status"],
          required: false,
        },
      ],
    });

    return {
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
      data: rows,
    };
  }

  // Get section options (lightweight query for dropdowns)
  async findOptions(tenantId, classId, academicYearId) {
    return await this.model.findAll({
      where: {
        tenantId,
        classId,
        academicYearId,
      },
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
      raw: true,
    });
  }
}