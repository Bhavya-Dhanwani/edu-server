import { ClassSubject, Class, SubjectMaster } from "../../../models/index.js";
import { BaseRepository } from "../../base.repository.js";
import { Op } from "sequelize";

export class ClassSubjectRepository extends BaseRepository {
  constructor() {
    super(ClassSubject);
  }

  async findByClassId(classId, tenantId, options = {}) {
    const queryOptions = Array.isArray(options) ? { include: options } : options;
    
    return await this.model.findAll({
      where: { classId, tenantId },
      include: [
        {
          association: "subject",
          attributes: ["id", "name", "type"]
        },
        {
          association: "class",
          attributes: ["id", "name", "numericLevel"]
        }
      ],
      order: [["createdAt", "DESC"]],
      ...queryOptions,
    });
  }

  async findBySubjectId(subjectMasterId, tenantId, options = {}) {
    const queryOptions = Array.isArray(options) ? { include: options } : options;
    
    return await this.model.findAll({
      where: { subjectMasterId, tenantId },
      include: [
        {
          association: "subject",
          attributes: ["id", "name", "type"]
        },
        {
          association: "class",
          attributes: ["id", "name", "numericLevel"]
        }
      ],
      order: [["createdAt", "DESC"]],
      ...queryOptions,
    });
  }

  async findByClassAndSubject(classId, subjectMasterId, tenantId, options = {}) {
    const queryOptions = Array.isArray(options) ? { include: options } : options;
    
    return await this.model.findOne({
      where: { classId, subjectMasterId, tenantId },
      include: [
        {
          association: "subject",
          attributes: ["id", "name", "type"]
        },
        {
          association: "class",
          attributes: ["id", "name", "numericLevel"]
        }
      ],
      ...queryOptions,
    });
  }

  async findAllByClassAndSubjectIds(classId, subjectMasterIds, tenantId, options = {}) {
    const queryOptions = Array.isArray(options) ? { include: options } : options;

    return await this.model.findAll({
      where: {
        classId,
        subjectMasterId: { [Op.in]: subjectMasterIds },
        tenantId,
      },
      attributes: ["id", "subjectMasterId", "code", "isElective", "weeklyPeriods", "passingMarks"],
      ...queryOptions,
    });
  }

  async findWithPagination(tenantId, filters = {}, page = 1, limit = 10, options = {}) {
    const offset = (page - 1) * limit;
    const where = { tenantId, ...filters };
    const { where: _where, distinct, order, ...queryOptions } = options;
    
    const include = options.include || [
      {
        association: "subject",
        attributes: ["id", "name", "type"]
      },
      {
        association: "class",
        attributes: ["id", "name", "numericLevel"]
      }
    ];
    
    const { count, rows } = await this.model.findAndCountAll({
      where,
      offset,
      limit,
      include,
      distinct: distinct ?? Boolean(include),
      order: order || [["createdAt", "DESC"]],
      ...queryOptions,
    });

    return {
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
      data: rows,
    };
  }

  async findGroupedByClass(tenantId, page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    const { search, classId, isElective } = filters;
    const searchTerm = String(search || "").trim();

    const classSubjectWhere = { tenantId };
    if (classId) {
      classSubjectWhere.classId = classId;
    }
    if (isElective === true || isElective === false) {
      classSubjectWhere.isElective = isElective;
    }

    if (searchTerm) {
      classSubjectWhere[Op.or] = [
        { code: { [Op.iLike]: `%${searchTerm}%` } },
        { "$class.name$": { [Op.iLike]: `%${searchTerm}%` } },
        { "$subject.name$": { [Op.iLike]: `%${searchTerm}%` } },
      ];
    }

    const allMappings = await this.model.findAll({
      where: classSubjectWhere,
      include: [
        {
          association: "subject",
          attributes: ["id", "name", "type"]
        },
        {
          association: "class",
          attributes: ["id", "name", "numericLevel"]
        }
      ],
      order: [
        [{ model: Class, as: "class" }, "numericLevel", "ASC"],
        ["createdAt", "DESC"]
      ],
    });

    const classMap = new Map();

    for (const mapping of allMappings) {
      const cId = mapping.classId;
      if (!classMap.has(cId)) {
        classMap.set(cId, {
          classId: cId,
          className: mapping.class?.name || "Unknown Class",
          numericLevel: mapping.class?.numericLevel || 0,
          class: mapping.class ? {
            id: mapping.class.id,
            name: mapping.class.name,
            numericLevel: mapping.class.numericLevel
          } : null,
          subjects: [],
        });
      }

      classMap.get(cId).subjects.push({
        id: mapping.id,
        classId: mapping.classId,
        subjectMasterId: mapping.subjectMasterId,
        code: mapping.code,
        isElective: mapping.isElective,
        weeklyPeriods: mapping.weeklyPeriods,
        passingMarks: mapping.passingMarks,
        tenantId: mapping.tenantId,
        createdAt: mapping.createdAt,
        updatedAt: mapping.updatedAt,
        subject: mapping.subject ? {
          id: mapping.subject.id,
          name: mapping.subject.name,
          type: mapping.subject.type
        } : null,
      });
    }

    const groupedArray = Array.from(classMap.values());
    const total = groupedArray.length;
    const paginatedData = groupedArray.slice(offset, offset + limit);

    return {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      data: paginatedData,
    };
  }

  async searchClassSubject(tenantId, searchTerm, page = 1, limit = 10, filters = {}) {
    return await this.search(tenantId, searchTerm, [
      "code",
    ], {
      page,
      limit,
      filters,
      order: [["createdAt", "DESC"]],
      include: [
        {
          association: "subject",
          attributes: ["id", "name", "type"]
        },
        {
          association: "class",
          attributes: ["id", "name", "numericLevel"]
        }
      ],
    });
  }

  async deleteByClassId(classId, tenantId) {
    return await this.model.destroy({
      where: { classId, tenantId }
    });
  }
}
