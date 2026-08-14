import sequelize from "../../config/db.js";
import { AdmissionLeadRepository } from "../../repositories/admissions/admissionLead.repository.js";
import { StudentRepository } from "../../repositories/student.repository.js";
import { GuardianService } from "../guardian.service.js";
import { UserService } from "../user.service.js";
import { UserRoleService } from "../user-role.service.js";
import { RoleService } from "../role.service.js";
import { StudentSectionEnrollmentRepository } from "../../repositories/studentSectionEnrollment.repository.js";
import { SectionRepository } from "../../repositories/Academic/section.repository.js";
import { AcademicYearRepository } from "../../repositories/Academic/academicYear.repository.js";
import { ClassRepository } from "../../repositories/Academic/class.repository.js";
import { AppError } from "../../utils/AppError.js";

const leadRepo = new AdmissionLeadRepository();
const studentRepo = new StudentRepository();
const guardianService = new GuardianService();
const userService = new UserService();
const userRoleService = new UserRoleService();
const roleService = new RoleService();
const enrollmentRepo = new StudentSectionEnrollmentRepository();
const sectionRepo = new SectionRepository();
const academicYearRepo = new AcademicYearRepository();
const classRepo = new ClassRepository();

const VALID_STATUSES = [
  "new",
  "contacted",
  "under_review",
  "approved",
  "rejected",
  "converted",
  "cancelled",
];

export class AdmissionLeadService {
  async createLead(tenantId, payload) {
    const { academicYearId, appliedClassId, assignedToId } = payload;

    // Validate academic year exists
    const year = await academicYearRepo.findById(academicYearId, tenantId);
    if (!year) {
      throw new AppError("Academic year not found", 404);
    }

    // Validate applied class exists
    const appliedClass = await classRepo.findById(appliedClassId, tenantId);
    if (!appliedClass) {
      throw new AppError("Applied class not found", 404);
    }

    const leadData = {
      ...payload,
      tenantId,
      status: payload.status || "new",
      statusHistory: [
        {
          status: payload.status || "new",
          changedBy: payload.assignedToId || null,
          changedAt: new Date().toISOString(),
          remarks: "Initial lead creation",
        },
      ],
    };

    const lead = await leadRepo.create(leadData);
    return await leadRepo.findLeadById(lead.id, tenantId);
  }

  async getAllLeads(tenantId, queryParams = {}) {
    return await leadRepo.searchLeads(tenantId, queryParams);
  }

  async getLeadById(id, tenantId) {
    const lead = await leadRepo.findLeadById(id, tenantId);
    if (!lead) {
      throw new AppError("Admission lead not found", 404);
    }
    return lead;
  }

  async updateLead(id, tenantId, payload) {
    const lead = await leadRepo.findById(id, tenantId);
    if (!lead) {
      throw new AppError("Admission lead not found", 404);
    }

    if (lead.status === "converted" || lead.convertedStudentId) {
      throw new AppError("Cannot modify an admission lead that has already been converted to a student", 400);
    }

    if (payload.status && payload.status === "converted") {
      throw new AppError(
        "Status cannot be changed to 'converted' directly. Please use the convert endpoint.",
        400,
      );
    }

    if (payload.academicYearId) {
      const year = await academicYearRepo.findById(payload.academicYearId, tenantId);
      if (!year) throw new AppError("Academic year not found", 404);
    }

    if (payload.appliedClassId) {
      const appliedClass = await classRepo.findById(payload.appliedClassId, tenantId);
      if (!appliedClass) throw new AppError("Applied class not found", 404);
    }

    await leadRepo.update(id, tenantId, payload);
    return await leadRepo.findLeadById(id, tenantId);
  }

  async updateLeadStatus(id, tenantId, statusPayload, userContext = {}) {
    const { status, rejectionReason, remarks } = statusPayload;

    if (!VALID_STATUSES.includes(status)) {
      throw new AppError(`Invalid status: ${status}`, 400);
    }

    if (status === "converted") {
      throw new AppError(
        "Status cannot be changed to 'converted' directly. Please use the convert endpoint.",
        400,
      );
    }

    const lead = await leadRepo.findById(id, tenantId);
    if (!lead) {
      throw new AppError("Admission lead not found", 404);
    }

    if (lead.status === "converted" || lead.convertedStudentId) {
      throw new AppError("Status cannot be changed for an admission lead that has already been converted to a student", 400);
    }

    const currentHistory = Array.isArray(lead.statusHistory)
      ? lead.statusHistory
      : [];

    const newHistoryItem = {
      status,
      changedBy: userContext.id || null,
      changedAt: new Date().toISOString(),
      rejectionReason: rejectionReason || null,
      remarks: remarks || null,
    };

    const updateData = {
      status,
      rejectionReason: status === "rejected" ? rejectionReason || lead.rejectionReason : lead.rejectionReason,
      remarks: remarks !== undefined ? remarks : lead.remarks,
      statusHistory: [...currentHistory, newHistoryItem],
    };

    await leadRepo.update(id, tenantId, updateData);
    return await leadRepo.findLeadById(id, tenantId);
  }

  async convertLeadToStudent(id, tenantId, convertPayload, userContext = {}) {
    const { admissionDate, sectionId, createLogin, email, password } = convertPayload;

    const lead = await leadRepo.findById(id, tenantId);
    if (!lead) {
      throw new AppError("Admission lead not found", 404);
    }

    if (lead.status === "converted" || lead.convertedStudentId) {
      throw new AppError("Admission lead has already been converted to a student", 400);
    }

    if (lead.status !== "approved") {
      throw new AppError("Only approved admission leads can be converted", 400);
    }

    if (!sectionId) {
      throw new AppError("sectionId is required for conversion", 400);
    }

    const section = await sectionRepo.findById(sectionId, tenantId);
    if (!section) {
      throw new AppError("Section not found", 404);
    }

    if (createLogin) {
      if (!email || !password) {
        throw new AppError("Email and password are required when createLogin is true", 400);
      }
    }

    const transaction = await sequelize.transaction();

    try {
      let createdUser = null;

      // 1. Create Login User Account if requested
      if (createLogin) {
        createdUser = await userService.createUser(
          {
            email,
            password,
            firstName: lead.firstName,
            lastName: lead.lastName,
            tenantId,
            status: "active",
            emailVerified: true,
          },
          { transaction },
        );

        // Assign 'student' role
        const roles = await roleService.getAllRoles(tenantId, { slug: "student" });
        const studentRole = roles[0];
        if (studentRole) {
          await userRoleService.assignRoleToUser(
            {
              userId: createdUser.id,
              roleId: studentRole.id,
              tenantId,
              assignedById: userContext.id || null,
            },
            { transaction },
          );
        }
      }

      // 2. Generate Admission Number
      const yearSuffix = new Date().getFullYear();
      const randomPart = Math.floor(100000 + Math.random() * 900000);
      const admissionNumber = `ADM-${yearSuffix}-${randomPart}`;

      // 3. Create Student Profile
      const studentFields = {
        tenantId,
        userId: createdUser ? createdUser.id : null,
        admissionNumber,
        rollNumber: null,
        firstName: lead.firstName,
        middleName: lead.middleName || null,
        lastName: lead.lastName,
        dateOfBirth: lead.dateOfBirth,
        gender: lead.gender,
        bloodGroup: lead.bloodGroup || "unknown",
        nationality: lead.nationality || "Indian",
        religion: lead.religion || null,
        caste: lead.caste || null,
        category: lead.category || null,
        aadharNumber: lead.aadharNumber || null,
        photoUrl: lead.photoUrl || null,
        enrollmentDate: admissionDate || new Date().toISOString().split("T")[0],
        previousSchool: lead.previousSchool || null,
        previousClass: lead.previousClass || null,
        tcNumber: lead.tcNumber || null,
        isStaffWard: lead.isStaffWard || false,
        status: "active",
        transportRequired: lead.transportRequired || false,
        hostelRequired: lead.hostelRequired || false,
        medicalConditions: lead.medicalConditions || null,
        emergencyContactName: lead.emergencyContactName || null,
        emergencyContactPhone: lead.emergencyContactPhone || null,
        address: lead.address || null,
        city: lead.city || null,
        pincode: lead.pincode || null,
      };

      const student = await studentRepo.create(studentFields, { transaction });

      // 4. Copy & Link Guardian Info
      const guardian = await guardianService.resolveGuardian(
        tenantId,
        {
          email: lead.guardianEmail || null,
          firstName: lead.guardianName,
          lastName: "",
          phone: lead.guardianPhone,
          relation: "guardian",
          isPrimaryContact: true,
          requestedBy: userContext.id || null,
        },
        { transaction },
      );

      await guardianService.attachStudents(
        guardian.id,
        tenantId,
        {
          studentIds: [student.id],
          relationType: "guardian",
          isPrimary: true,
          canPickup: true,
        },
        { transaction },
      );

      // 5. Enroll Student into Section
      await enrollmentRepo.create(
        {
          tenantId,
          studentId: student.id,
          sectionId,
          academicYearId: lead.academicYearId,
          enrollmentStatus: "regular",
          isCurrent: true,
        },
        { transaction },
      );

      // 6. Update Admission Lead Status to Converted
      const currentHistory = Array.isArray(lead.statusHistory)
        ? lead.statusHistory
        : [];

      const newHistoryItem = {
        status: "converted",
        changedBy: userContext.id || null,
        changedAt: new Date().toISOString(),
        remarks: `Converted to Student (ID: ${student.id}, Admission Number: ${student.admissionNumber})`,
      };

      await lead.update(
        {
          status: "converted",
          convertedStudentId: student.id,
          statusHistory: [...currentHistory, newHistoryItem],
        },
        { transaction },
      );

      await transaction.commit();

      const updatedLead = await leadRepo.findLeadById(lead.id, tenantId);
      const fullStudent = await studentRepo.findById(student.id, tenantId);

      return {
        admissionLead: updatedLead,
        student: fullStudent,
      };
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  }
}
