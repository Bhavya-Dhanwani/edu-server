import { Op } from "sequelize";
import {
  AdmissionLead,
  AcademicYear,
  Class,
  User,
  Student,
  Tenant,
} from "../../models/index.js";
import { BaseRepository } from "../base.repository.js";

const ADMISSION_LEAD_INCLUDES = [
  {
    model: AcademicYear,
    as: "academicYear",
    attributes: ["id", "name", "startDate", "endDate", "isCurrent"],
  },
  {
    model: Class,
    as: "appliedClass",
    attributes: ["id", "name", "numericLevel"],
  },
  {
    model: User,
    as: "assignedTo",
    attributes: ["id", "firstName", "lastName", "email", "phone"],
  },
  {
    model: Student,
    as: "convertedStudent",
    attributes: ["id", "admissionNumber", "firstName", "lastName"],
  },
];

export class AdmissionLeadRepository extends BaseRepository {
  constructor() {
    super(AdmissionLead);
  }

  async findLeadById(id, tenantId, options = {}) {
    return await this.findById(id, tenantId, {
      include: ADMISSION_LEAD_INCLUDES,
      ...options,
    });
  }

  async searchLeads(tenantId, options = {}) {
    const {
      search,
      status,
      academicYearId,
      appliedClassId,
      assignedToId,
      page = 1,
      limit = 10,
    } = options;

    const filters = {};

    if (status) {
      filters.status = status;
    }

    if (academicYearId) {
      filters.academicYearId = academicYearId;
    }

    if (appliedClassId) {
      filters.appliedClassId = appliedClassId;
    }

    if (assignedToId) {
      filters.assignedToId = assignedToId;
    }

    const searchableFields = [
      "firstName",
      "lastName",
      "guardianName",
      "guardianPhone",
      "guardianEmail",
    ];

    const includes = ADMISSION_LEAD_INCLUDES.map((inc) => {
      if (inc.as === "academicYear") {
        return {
          ...inc,
          where: academicYearId ? { id: academicYearId } : { isCurrent: true },
          required: true,
        };
      }
      return inc;
    });

    return await this.search(tenantId, search, searchableFields, {
      filters,
      page,
      limit,
      order: [["createdAt", "DESC"]],
      include: includes,
    });
  }
}
