import sequelize from "../config/db.js";
import { GuardianService } from "./guardian.service.js";
import { StudentRepository } from "../repositories/student.repository.js";
import { GuardianRepository } from "../repositories/guardian.repository.js";
import { AppError } from "../utils/AppError.js";
import { RoleService } from "./role.service.js";
import { UserRoleService } from "./user-role.service.js";
import { UserService } from "./user.service.js";
import { StudentSectionEnrollmentRepository } from "../repositories/studentSectionEnrollment.repository.js";
import { SectionRepository } from "../repositories/Academic/section.repository.js";
import { AcademicYearRepository } from "../repositories/Academic/academicYear.repository.js";
import { StudentGuardianMap } from "../models/index.js";

const studentRepo = new StudentRepository();
const guardianRepo = new GuardianRepository();
const guardianService = new GuardianService();
const userService = new UserService();
const userRoleService = new UserRoleService();
const roleService = new RoleService();
const enrollmentRepo = new StudentSectionEnrollmentRepository();
const sectionRepo = new SectionRepository();
const academicYearRepo = new AcademicYearRepository();

export class StudentService {
  async createStudent(tenantId, payload) {
    const {
      email,
      password,
      firstName,
      lastName,
      admissionNumber,
      guardians = [],
      requestedBy,
      sectionId,
      academicYearId,
      enrollmentStatus,
      rollNumber,
      siblingId,
      ...studentFields
    } = payload;

    // 1. Check if admission number already exists
    const existingAdmission = await studentRepo.findByAdmissionNumber(
      admissionNumber,
      tenantId,
    );
    if (existingAdmission) {
      throw new AppError("Admission number already exists", 400);
    }

    // 2. Validate sibling exists and belongs to same tenant
    if (siblingId) {
      const sibling = await studentRepo.findById(siblingId, tenantId);
      if (!sibling) {
        throw new AppError("Sibling student not found in this organization", 404);
      }
    }

    const transaction = await sequelize.transaction();

    try {
      // 3. Create User Account
      const user = await userService.createUser(
        {
          email,
          password,
          firstName,
          lastName,
          tenantId,
          status: "active",
          emailVerified: true,
        },
        { transaction },
      );

      // 4. Resolve 'student' Role
      const roles = await roleService.getAllRoles(tenantId, {
        slug: "student",
      });
      const studentRole = roles[0];

      if (!studentRole) {
        throw new AppError(
          "Student (Portal) role not found for this tenant",
          404,
        );
      }

      // 5. Assign Role
      await userRoleService.assignRoleToUser(
        {
          userId: user.id,
          roleId: studentRole.id,
          tenantId,
          assignedById: requestedBy,
        },
        { transaction },
      );

      // 6. Create Student Profile
      const student = await studentRepo.create(
        {
          ...studentFields,
          firstName: firstName?.trim(),
          middleName: payload.middleName?.trim() || null,
          lastName: lastName?.trim(),
          tenantId,
          userId: user.id,
          admissionNumber: admissionNumber.trim(),
        },
        { transaction },
      );

      for (const guardianInput of guardians) {
        const {
          email: guardianEmail,
          password: guardianPassword,
          firstName: guardianFirstName,
          lastName: guardianLastName,
          relation,
          relationType,
          phone,
          occupation,
          isPrimaryContact,
          isPrimary,
          canPickup,
        } = guardianInput;

        const normalizedRelationType =
          relationType ??
          (relation === "father" || relation === "mother" || relation === "guardian"
            ? relation
            : "other");

        const guardian = await guardianService.resolveGuardian(
          tenantId,
          {
            email: guardianEmail,
            password: guardianPassword,
            firstName: guardianFirstName,
            lastName: guardianLastName,
            relation,
            phone,
            occupation,
            isPrimaryContact,
            requestedBy,
          },
          { transaction },
        );

        await guardianService.attachStudents(
          guardian.id,
          tenantId,
          {
            studentIds: [student.id],
            relationType: normalizedRelationType,
            isPrimary: isPrimary ?? false,
            canPickup: canPickup ?? true,
          },
          { transaction },
        );
      }

      // 7. Validate circular sibling reference
      if (siblingId) {
        const sibling = await studentRepo.findById(siblingId, tenantId);
        if (sibling && sibling.siblingId === student.id) {
          throw new AppError("Cannot create circular sibling relationship", 400);
        }
      }

      // 8. Auto-enroll in section if sectionId is provided
      if (sectionId) {
        const section = await sectionRepo.findById(sectionId, tenantId);
        if (!section) {
          throw new AppError("Section not found", 404);
        }

        let targetAcademicYearId = academicYearId || section.academicYearId;
        if (!targetAcademicYearId) {
          const currentYear = await academicYearRepo.findCurrentYear(tenantId);
          if (currentYear) {
            targetAcademicYearId = currentYear.id;
          }
        }

        if (!targetAcademicYearId) {
          throw new AppError(
            "Academic year not specified and no active academic year configured",
            400,
          );
        }

        // Check capacity
        const enrolledCount = await enrollmentRepo.countBySection(
          sectionId,
          tenantId,
        );
        if (enrolledCount >= section.capacity) {
          throw new AppError("Section capacity full", 400);
        }

        // Create enrollment
        await enrollmentRepo.create(
          {
            tenantId,
            studentId: student.id,
            sectionId,
            academicYearId: targetAcademicYearId,
            rollNumber: rollNumber || enrolledCount + 1,
            enrollmentStatus: enrollmentStatus || "regular",
            isCurrent: true,
          },
          { transaction },
        );
      }

      await transaction.commit();

      // Reload the student with all associations so the response is complete
      const fullStudent = await studentRepo.findWithDetails(student.id, tenantId);
      return this.formatStudentResponse(fullStudent);
    } catch (error) {
      if (!transaction.finished) await transaction.rollback();
      throw error;
    }
  }

  async getAllStudents(tenantId, query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;

    const filters = {};
    if (query.status) filters.status = query.status;
    if (query.gender) filters.gender = query.gender;
    if (query.admissionNumber) filters.admissionNumber = query.admissionNumber;
    if (query.userId) filters.userId = query.userId;
    if (query.name) filters.name = query.name;
    if (query.search) filters.search = query.search;
    if (query.classId) filters.classId = query.classId;
    if (query.sectionId) filters.sectionId = query.sectionId;
    if (query.academicYearId) filters.academicYearId = query.academicYearId;

    const result = await studentRepo.findWithPagination(tenantId, filters, page, limit);

    return {
      ...result,
      data: result.data.map((student) => {
        const studentData = student.get ? student.get({ plain: true }) : student;
        return this.formatStudentResponse(studentData, query);
      }),
    };
  }

  // Get Students NOT assigned to any section
  async getUnassignedStudents(tenantId, query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;

    const filters = {};
    if (query.status) filters.status = query.status;
    if (query.name) filters.name = query.name;
    if (query.search) filters.search = query.search.trim();

    const result = await studentRepo.findUnassignedStudents(tenantId, filters, page, limit);

    return {
      ...result,
      data: result.data.map(student => {
        const studentData = student.get ? student.get({ plain: true }) : student;
        return this.formatStudentResponse(studentData);
      }),
    };
  }


  async getStudentById(id, tenantId) {
    const student = await studentRepo.findWithDetails(id, tenantId);
    if (!student) {
      throw new AppError("Student not found", 404);
    }

    const studentData = student.get ? student.get({ plain: true }) : student;
    return this.formatStudentResponse(studentData);
  }

  async getStudentByUserId(userId, tenantId) {
    const student = await studentRepo.findByUserId(userId, tenantId);
    if (!student) {
      throw new AppError("Student profile not found for this user", 404);
    }
    const fullStudent = await studentRepo.findWithDetails(student.id, tenantId);
    const studentData = fullStudent.get ? fullStudent.get({ plain: true }) : fullStudent;
    return this.formatStudentResponse(studentData);
  }

  async updateStudent(id, tenantId, updateData) {
    if (updateData.userId !== undefined) {
      throw new AppError("userId cannot be updated", 400);
    }

    // Check admission number uniqueness if being updated
    if (updateData.admissionNumber !== undefined) {
      const existingAdmission = await studentRepo.findByAdmissionNumber(
        updateData.admissionNumber,
        tenantId,
      );
      if (existingAdmission && existingAdmission.id !== id) {
        throw new AppError(
          "Admission number already exists for this tenant",
          400,
        );
      }
    }

    // Validate sibling if being updated
    if (updateData.siblingId !== undefined && updateData.siblingId !== null) {
      if (updateData.siblingId === id) {
        throw new AppError("A student cannot be their own sibling", 400);
      }

      const sibling = await studentRepo.findById(updateData.siblingId, tenantId);
      if (!sibling) {
        throw new AppError("Sibling student not found in this organization", 404);
      }

      // Check for circular reference
      if (sibling.siblingId === id) {
        throw new AppError("Cannot create circular sibling relationship", 400);
      }
    }

    const updated = await studentRepo.update(id, tenantId, {
      ...(updateData.admissionNumber !== undefined
        ? { admissionNumber: updateData.admissionNumber }
        : {}),
      ...(updateData.rollNumber !== undefined
        ? { rollNumber: updateData.rollNumber }
        : {}),
      ...(updateData.firstName !== undefined
        ? { firstName: updateData.firstName }
        : {}),
      ...(updateData.middleName !== undefined
        ? { middleName: updateData.middleName }
        : {}),
      ...(updateData.lastName !== undefined
        ? { lastName: updateData.lastName }
        : {}),
      ...(updateData.dateOfBirth !== undefined
        ? { dateOfBirth: updateData.dateOfBirth }
        : {}),
      ...(updateData.gender !== undefined ? { gender: updateData.gender } : {}),
      ...(updateData.bloodGroup !== undefined
        ? { bloodGroup: updateData.bloodGroup }
        : {}),
      ...(updateData.nationality !== undefined
        ? { nationality: updateData.nationality }
        : {}),
      ...(updateData.religion !== undefined
        ? { religion: updateData.religion }
        : {}),
      ...(updateData.caste !== undefined ? { caste: updateData.caste } : {}),
      ...(updateData.category !== undefined
        ? { category: updateData.category }
        : {}),
      ...(updateData.aadharNumber !== undefined
        ? { aadharNumber: updateData.aadharNumber }
        : {}),
      ...(updateData.photoUrl !== undefined
        ? { photoUrl: updateData.photoUrl }
        : {}),
      ...(updateData.enrollmentDate !== undefined
        ? { enrollmentDate: updateData.enrollmentDate }
        : {}),
      ...(updateData.previousSchool !== undefined
        ? { previousSchool: updateData.previousSchool }
        : {}),
      ...(updateData.previousClass !== undefined
        ? { previousClass: updateData.previousClass }
        : {}),
      ...(updateData.tcNumber !== undefined
        ? { tcNumber: updateData.tcNumber }
        : {}),
      ...(updateData.siblingId !== undefined
        ? { siblingId: updateData.siblingId }
        : {}),
      ...(updateData.isStaffWard !== undefined
        ? { isStaffWard: updateData.isStaffWard }
        : {}),
      ...(updateData.status !== undefined ? { status: updateData.status } : {}),
      ...(updateData.transportRequired !== undefined
        ? { transportRequired: updateData.transportRequired }
        : {}),
      ...(updateData.hostelRequired !== undefined
        ? { hostelRequired: updateData.hostelRequired }
        : {}),
      ...(updateData.medicalConditions !== undefined
        ? { medicalConditions: updateData.medicalConditions }
        : {}),
      ...(updateData.emergencyContactName !== undefined
        ? { emergencyContactName: updateData.emergencyContactName }
        : {}),
      ...(updateData.emergencyContactPhone !== undefined
        ? { emergencyContactPhone: updateData.emergencyContactPhone }
        : {}),
      ...(updateData.address !== undefined
        ? { address: updateData.address }
        : {}),
      ...(updateData.city !== undefined ? { city: updateData.city } : {}),
      ...(updateData.pincode !== undefined
        ? { pincode: updateData.pincode }
        : {}),
    });

    // Fetch updated record with all details (guardians, user, enrollments)
    const updatedWithDetails = await studentRepo.findWithDetails(id, tenantId);
    const updatedData = updatedWithDetails.get ? updatedWithDetails.get({ plain: true }) : updatedWithDetails;
    return this.formatStudentResponse(updatedData);
  }

  async deleteStudent(id, tenantId) {
    const transaction = await sequelize.transaction();

    try {
      // Fetch student with guardian IDs only (lightweight)
      const student = await studentRepo.findWithDetails(id, tenantId);
      if (!student) {
        throw new AppError("Student not found", 404);
      }
      
      const guardianIds = student.guardians?.map(g => g.id) || [];
      
      // Explicitly delete StudentGuardianMap entries first
      await StudentGuardianMap.destroy({ 
        where: { studentId: id, tenantId },
        transaction
      });
      
      // Delete student
      await studentRepo.delete(id, tenantId, { transaction });

      // Find orphaned guardians in single query (with transaction for consistency)
      if (guardianIds.length > 0) {
        const orphanedGuardianIds = await guardianRepo.findOrphanedGuardians(guardianIds, tenantId, { transaction });
        
        // Batch delete orphaned guardians
        if (orphanedGuardianIds.length > 0) {
          await guardianRepo.deleteMultiple(orphanedGuardianIds, tenantId, { transaction });
        }
      }

      await transaction.commit();
      
      const studentData = student.get ? student.get({ plain: true }) : student;
      return {
        message: "Student deleted successfully",
        data: this.formatStudentResponse(studentData),
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

   formatStudentResponse(student, targetQuery = {}) {
    const enrollments = Array.isArray(student.enrollments) ? student.enrollments : [];
    let selectedEnrollment = null;

    if (targetQuery.sectionId) {
      selectedEnrollment =
        enrollments.find(
          (e) =>
            (e.sectionId === targetQuery.sectionId || e.section?.id === targetQuery.sectionId) &&
            (targetQuery.academicYearId ? e.academicYearId === targetQuery.academicYearId : e.academicYear?.isCurrent === true)
        ) ||
        enrollments.find(
          (e) => e.sectionId === targetQuery.sectionId || e.section?.id === targetQuery.sectionId
        );
    }
    if (!selectedEnrollment && targetQuery.classId) {
      selectedEnrollment =
        enrollments.find(
          (e) =>
            (e.section?.class?.id === targetQuery.classId || e.section?.classId === targetQuery.classId) &&
            (targetQuery.academicYearId ? e.academicYearId === targetQuery.academicYearId : e.academicYear?.isCurrent === true)
        ) ||
        enrollments.find(
          (e) => e.section?.class?.id === targetQuery.classId || e.section?.classId === targetQuery.classId
        );
    }
    if (!selectedEnrollment && targetQuery.academicYearId) {
      selectedEnrollment = enrollments.find((e) => e.academicYearId === targetQuery.academicYearId);
    }
    if (!selectedEnrollment) {
      selectedEnrollment = enrollments.find((e) => e.academicYear?.isCurrent === true) || enrollments.find((e) => e.isCurrent) || enrollments[0];
    }

    const formatEnrollment = (enrollment) => ({
      id: enrollment.id,
      rollNumber: enrollment.rollNumber,
      enrollmentStatus: enrollment.enrollmentStatus,
      isCurrent: enrollment.isCurrent,
      createdAt: enrollment.createdAt,
      section: enrollment.section
        ? {
            id: enrollment.section.id,
            name: enrollment.section.name,
            capacity: enrollment.section.capacity,
            class: enrollment.section.class
              ? {
                  id: enrollment.section.class.id,
                  name: enrollment.section.class.name,
                  numericLevel: enrollment.section.class.numericLevel,
                }
              : undefined,
          }
        : undefined,
      academicYear: enrollment.academicYear
        ? {
            id: enrollment.academicYear.id,
            name: enrollment.academicYear.name,
            isCurrent: enrollment.academicYear.isCurrent,
          }
        : undefined,
    });

    return {
      id: student.id,
      admissionNumber: student.admissionNumber,
      rollNumber: student.rollNumber,
      firstName: student.firstName,
      middleName: student.middleName,
      lastName: student.lastName,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      bloodGroup: student.bloodGroup,
      nationality: student.nationality,
      religion: student.religion,
      caste: student.caste,
      category: student.category,
      aadharNumber: student.aadharNumber,
      photoUrl: student.photoUrl,
      enrollmentDate: student.enrollmentDate,
      previousSchool: student.previousSchool,
      previousClass: student.previousClass,
      tcNumber: student.tcNumber,
      isStaffWard: student.isStaffWard,
      status: student.status,
      transportRequired: student.transportRequired,
      hostelRequired: student.hostelRequired,
      medicalConditions: student.medicalConditions,
      emergencyContactName: student.emergencyContactName,
      emergencyContactPhone: student.emergencyContactPhone,
      address: student.address,
      city: student.city,
      pincode: student.pincode,
      customFields: student.customFields,
      metadata: student.metadata,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
      tenant: student.organization
        ? {
            id: student.organization.id,
            name: student.organization.name,
            organizationType: student.organization.organizationType,
            officialEmail: student.organization.officialEmail,
            subdomain: student.organization.subdomain,
          }
        : undefined,
      user: student.user
        ? {
            id: student.user.id,
            firstName: student.user.firstName,
            lastName: student.user.lastName,
            email: student.user.email,
            phone: student.user.phone,
            status: student.user.status,
          }
        : undefined,
      sibling: student.sibling
        ? {
            id: student.sibling.id,
            firstName: student.sibling.firstName,
            lastName: student.sibling.lastName,
            rollNumber: student.sibling.rollNumber,
            user: student.sibling.user
              ? {
                  id: student.sibling.user.id,
                  firstName: student.sibling.user.firstName,
                  lastName: student.sibling.user.lastName,
                  email: student.sibling.user.email,
                  phone: student.sibling.user.phone,
                }
              : undefined,
          }
        : null,
      guardians: Array.isArray(student.guardians)
        ? student.guardians.map((g) => ({
            id: g.id,
            tenantId: g.tenantId,
            userId: g.userId,
            relation: g.relation,
            phone: g.phone,
            occupation: g.occupation,
            isPrimaryContact: g.isPrimaryContact,
            relationType: g.relationType ?? g.StudentGuardianMap?.relationType,
            isPrimary: g.isPrimary ?? g.StudentGuardianMap?.isPrimary,
            canPickup: g.canPickup ?? g.StudentGuardianMap?.canPickup,
            user: g.user
              ? {
                  id: g.user.id,
                  firstName: g.user.firstName,
                  lastName: g.user.lastName,
                  email: g.user.email,
                  phone: g.user.phone,
                }
              : undefined,
            map: g.StudentGuardianMap
              ? {
                  id: g.StudentGuardianMap.id,
                  relationType: g.StudentGuardianMap.relationType,
                  isPrimary: g.StudentGuardianMap.isPrimary,
                  canPickup: g.StudentGuardianMap.canPickup,
                }
              : undefined,
          }))
        : [],
      enrollment: selectedEnrollment ? formatEnrollment(selectedEnrollment) : undefined,
      enrollments: student.enrollments || undefined,
    };
  }

  async getStudentStats(tenantId, query = {}) {
    const filters = {};
    if (query.classId) filters.classId = query.classId;
    if (query.sectionId) filters.sectionId = query.sectionId;
    if (query.academicYearId) filters.academicYearId = query.academicYearId;

    return await studentRepo.getStudentStats(tenantId, filters);
  }
}
