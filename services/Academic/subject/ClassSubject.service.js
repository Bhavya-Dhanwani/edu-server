import { ClassSubjectRepository } from "../../../repositories/Academic/subject/ClassSubject.repository.js";
import { SubjectMasterRepository } from "../../../repositories/Academic/subject/SubjectMaster.repository.js";
import { ClassRepository } from "../../../repositories/Academic/class.repository.js";
import { BaseService } from "../../base.service.js";
import { AppError } from "../../../utils/AppError.js";
import sequelize from "../../../config/db.js";

const classSubjectRepo = new ClassSubjectRepository();
const subjectRepo = new SubjectMasterRepository();
const classRepo = new ClassRepository();

export class ClassSubjectService extends BaseService {
  constructor() {
    super(classSubjectRepo);
  }

  /**
   * ASSIGN MULTIPLE SUBJECTS TO A CLASS
   * Accepts array of subjects with mapping details
   */
  async assignSubjectsToClass(tenantId, payload) {
    const { classId, subjects } = payload;

    if (!classId) {
      throw new AppError("classId is required", 400);
    }

    if (!Array.isArray(subjects) || subjects.length === 0) {
      throw new AppError("subjects array is required and must not be empty", 400);
    }

    // Extract and validate subject IDs
    const subjectIds = subjects.map(s => s.subjectMasterId);
    const uniqueSubjectIds = [...new Set(subjectIds)];

    // Check for duplicate subject IDs in payload
    if (uniqueSubjectIds.length !== subjectIds.length) {
      throw new AppError("Duplicate subjects found in payload", 400);
    }

    // Verify class and subjects exist
    const [foundClass, foundSubjects] = await Promise.all([
      classRepo.findById(classId, tenantId),
      subjectRepo.findByIds(uniqueSubjectIds, tenantId),
    ]);

    if (!foundClass) {
      throw new AppError("Class not found", 404);
    }

    if (foundSubjects.length !== uniqueSubjectIds.length) {
      throw new AppError("One or more subjects not found", 404);
    }

    const transaction = await sequelize.transaction();

    try {
      const results = [];
      const existingMappings = await classSubjectRepo.findAllByClassAndSubjectIds(
        classId,
        subjectIds,
        tenantId,
        { transaction }
      );

      if (existingMappings.length > 0) {
        const assignedSubjectsMap = new Map(foundSubjects.map((s) => [s.id, s.name]));
        const alreadyAssignedNames = existingMappings
          .map((m) => assignedSubjectsMap.get(m.subjectMasterId) || "Subject")
          .join(", ");
        throw new AppError(
          `Subject(s) already assigned to this class: ${alreadyAssignedNames}`,
          400
        );
      }

      for (const subjectData of subjects) {
        const { subjectMasterId, code, isElective, weeklyPeriods, passingMarks } = subjectData;

        // Create new mapping
        const newMapping = await classSubjectRepo.create({
          tenantId,
          classId,
          subjectMasterId,
          code: code ?? null,
          isElective: isElective ?? false,
          weeklyPeriods: weeklyPeriods ?? 5,
          passingMarks: passingMarks ?? 33
        }, { transaction });

        // Fetch with associations
        const withAssociations = await classSubjectRepo.findById(newMapping.id, tenantId, {
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
          transaction
        });

        results.push(this.formatClassSubjectResponse(withAssociations));
      }

      await transaction.commit();
      return {
        message: `${results.length} subject(s) assigned to class successfully`,
        classId,
        data: results
      };
    } catch (error) {
      if (!transaction.finished) await transaction.rollback();
      throw error;
    }
  }

  /**
   * GET ALL CLASS SUBJECTS BY CLASS ID
   */
  async getSubjectsByClassId(classId, tenantId, query) {
    const page = Number.parseInt(query.page, 10) > 0 ? Number.parseInt(query.page, 10) : 1;
    const limit = Number.parseInt(query.limit, 10) > 0 ? Number.parseInt(query.limit, 10) : 10;

    const where = { classId, tenantId };

    if (query.isElective) {
      where.isElective = query.isElective === "true" || query.isElective === true;
    }

    const result = await classSubjectRepo.findWithPagination(tenantId, where, page, limit);
    result.data = result.data.map(cs => this.formatClassSubjectResponse(cs));
    
    return result;
  }

  /**
   * GET ALL CLASSES FOR A SUBJECT ID
   */
  async getClassesBySubjectId(subjectMasterId, tenantId, query) {
    const page = Number.parseInt(query.page, 10) > 0 ? Number.parseInt(query.page, 10) : 1;
    const limit = Number.parseInt(query.limit, 10) > 0 ? Number.parseInt(query.limit, 10) : 10;

    const where = { subjectMasterId, tenantId };

    const result = await classSubjectRepo.findWithPagination(tenantId, where, page, limit);
    result.data = result.data.map(cs => this.formatClassSubjectResponse(cs));
    
    return result;
  }

  /**
   * GET SINGLE CLASS SUBJECT MAPPING
   */
  async getClassSubjectById(id, tenantId) {
    const classSubject = await classSubjectRepo.findById(id, tenantId, {
      include: [
        {
          association: "subject",
          attributes: ["id", "name", "type"]
        },
        {
          association: "class",
          attributes: ["id", "name", "numericLevel"]
        }
      ]
    });
    return this.formatClassSubjectResponse(classSubject);
  }

  /**
   * UPDATE CLASS SUBJECT MAPPING
   */
  async updateClassSubject(id, tenantId, payload) {
    const { code, isElective, weeklyPeriods, passingMarks } = payload;

    const classSubject = await classSubjectRepo.findById(id, tenantId);
    if (!classSubject) {
      throw new AppError("Class subject mapping not found", 404);
    }

    const updatedClassSubject = await classSubjectRepo.update(id, tenantId, {
      code: code !== undefined ? code : classSubject.code,
      isElective: isElective !== undefined ? isElective : classSubject.isElective,
      weeklyPeriods: weeklyPeriods !== undefined ? weeklyPeriods : classSubject.weeklyPeriods,
      passingMarks: passingMarks !== undefined ? passingMarks : classSubject.passingMarks
    });

    // Fetch with associations
    const withAssociations = await classSubjectRepo.findById(updatedClassSubject.id, tenantId, {
      include: [
        {
          association: "subject",
          attributes: ["id", "name", "type"]
        },
        {
          association: "class",
          attributes: ["id", "name", "numericLevel"]
        }
      ]
    });

    return this.formatClassSubjectResponse(withAssociations);
  }

  /**
   * DELETE CLASS SUBJECT MAPPING
   */
  async deleteClassSubject(id, tenantId) {
    const classSubject = await classSubjectRepo.findById(id, tenantId);
    if (!classSubject) {
      throw new AppError("Class subject mapping not found", 404);
    }

    await classSubjectRepo.delete(id, tenantId);

    return {
      message: "Subject removed from class successfully",
      id,
      classId: classSubject.classId,
      subjectId: classSubject.subjectMasterId
    };
  }

  /**
   * DELETE ALL SUBJECTS FROM A CLASS
   */
  async removeAllSubjectsFromClass(classId, tenantId) {
    const deletedCount = await classSubjectRepo.deleteByClassId(classId, tenantId);

    return {
      message: `${deletedCount} subject(s) removed from class`,
      classId,
      deletedCount
    };
  }

  /**
   * SEARCH CLASS SUBJECTS (GROUPED BY CLASS)
   */
  async searchClassSubjects(tenantId, query) {
    const page = Number.parseInt(query.page, 10) > 0 ? Number.parseInt(query.page, 10) : 1;
    const limit = Number.parseInt(query.limit, 10) > 0 ? Number.parseInt(query.limit, 10) : 10;
    const searchTerm = String(query.search || "").trim();

    const filters = {};
    if (query.classId) {
      filters.classId = query.classId;
    }
    if (query.isElective === "true" || query.isElective === "false") {
      filters.isElective = query.isElective === "true";
    }

    return await classSubjectRepo.findGroupedByClass(tenantId, page, limit, {
      search: searchTerm,
      ...filters,
    });
  }

  /**
   * FORMAT RESPONSE
   */
  formatClassSubjectResponse(classSubject) {
    if (!classSubject) return null;

    return {
      id: classSubject.id,
      classId: classSubject.classId,
      subjectMasterId: classSubject.subjectMasterId,
      code: classSubject.code,
      isElective: classSubject.isElective,
      weeklyPeriods: classSubject.weeklyPeriods,
      passingMarks: classSubject.passingMarks,
      tenantId: classSubject.tenantId,
      subject: classSubject.subject ? {
        id: classSubject.subject.id,
        name: classSubject.subject.name,
        type: classSubject.subject.type
      } : null,
      class: classSubject.class ? {
        id: classSubject.class.id,
        name: classSubject.class.name,
        numericLevel: classSubject.class.numericLevel
      } : null,
      createdAt: classSubject.createdAt,
      updatedAt: classSubject.updatedAt
    };
  }
}
