import { describe, it, expect, beforeEach, vi } from "vitest";
import { AdmissionLeadService } from "../../../services/admissions/admissionLead.service.js";

const {
  mockLeadRepo,
  mockStudentRepo,
  mockGuardianService,
  mockUserService,
  mockUserRoleService,
  mockRoleService,
  mockEnrollmentRepo,
  mockSectionRepo,
  mockAcademicYearRepo,
  mockClassRepo,
} = vi.hoisted(() => {
  return {
    mockLeadRepo: {
      create: vi.fn(),
      findById: vi.fn(),
      findLeadById: vi.fn(),
      update: vi.fn(),
      searchLeads: vi.fn(),
    },
    mockStudentRepo: {
      create: vi.fn(),
      findById: vi.fn(),
    },
    mockGuardianService: {
      resolveGuardian: vi.fn(),
      attachStudents: vi.fn(),
    },
    mockUserService: {
      createUser: vi.fn(),
    },
    mockUserRoleService: {
      assignRoleToUser: vi.fn(),
    },
    mockRoleService: {
      getAllRoles: vi.fn(),
    },
    mockEnrollmentRepo: {
      create: vi.fn(),
    },
    mockSectionRepo: {
      findById: vi.fn(),
    },
    mockAcademicYearRepo: {
      findById: vi.fn(),
    },
    mockClassRepo: {
      findById: vi.fn(),
    },
  };
});

// Mock external dependencies
vi.mock("../../../config/db.js", () => {
  const mockTransaction = {
    commit: vi.fn(),
    rollback: vi.fn(),
    finished: false,
  };
  return {
    default: {
      transaction: vi.fn().mockResolvedValue(mockTransaction),
    },
  };
});

vi.mock("../../../repositories/admissions/admissionLead.repository.js", () => {
  return {
    AdmissionLeadRepository: vi.fn(function () {
      return mockLeadRepo;
    }),
  };
});

vi.mock("../../../repositories/student.repository.js", () => {
  return {
    StudentRepository: vi.fn(function () {
      return mockStudentRepo;
    }),
  };
});

vi.mock("../../../services/guardian.service.js", () => {
  return {
    GuardianService: vi.fn(function () {
      return mockGuardianService;
    }),
  };
});

vi.mock("../../../services/user.service.js", () => {
  return {
    UserService: vi.fn(function () {
      return mockUserService;
    }),
  };
});

vi.mock("../../../services/user-role.service.js", () => {
  return {
    UserRoleService: vi.fn(function () {
      return mockUserRoleService;
    }),
  };
});

vi.mock("../../../services/role.service.js", () => {
  return {
    RoleService: vi.fn(function () {
      return mockRoleService;
    }),
  };
});

vi.mock("../../../repositories/studentSectionEnrollment.repository.js", () => {
  return {
    StudentSectionEnrollmentRepository: vi.fn(function () {
      return mockEnrollmentRepo;
    }),
  };
});

vi.mock("../../../repositories/Academic/section.repository.js", () => {
  return {
    SectionRepository: vi.fn(function () {
      return mockSectionRepo;
    }),
  };
});

vi.mock("../../../repositories/Academic/academicYear.repository.js", () => {
  return {
    AcademicYearRepository: vi.fn(function () {
      return mockAcademicYearRepo;
    }),
  };
});

vi.mock("../../../repositories/Academic/class.repository.js", () => {
  return {
    ClassRepository: vi.fn(function () {
      return mockClassRepo;
    }),
  };
});

describe("AdmissionLeadService", () => {
  let service;
  const tenantId = "tenant-uuid-1";
  const academicYearId = "year-uuid-1";
  const appliedClassId = "class-uuid-1";
  const sectionId = "section-uuid-1";
  const leadId = "lead-uuid-1";

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdmissionLeadService();
  });

  describe("createLead", () => {
    it("should successfully create an admission lead when valid payload is passed", async () => {
      const payload = {
        academicYearId,
        appliedClassId,
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "2015-05-10",
        gender: "male",
        guardianName: "Robert Doe",
        guardianPhone: "9876543210",
      };

      mockAcademicYearRepo.findById.mockResolvedValue({ id: academicYearId });
      mockClassRepo.findById.mockResolvedValue({ id: appliedClassId });
      mockLeadRepo.create.mockResolvedValue({ id: leadId });
      mockLeadRepo.findLeadById.mockResolvedValue({
        id: leadId,
        ...payload,
        status: "new",
      });

      const result = await service.createLead(tenantId, payload);

      expect(mockAcademicYearRepo.findById).toHaveBeenCalledWith(academicYearId, tenantId);
      expect(mockClassRepo.findById).toHaveBeenCalledWith(appliedClassId, tenantId);
      expect(mockLeadRepo.create).toHaveBeenCalled();
      expect(result.status).toBe("new");
    });

    it("should throw 404 AppError if academic year does not exist", async () => {
      mockAcademicYearRepo.findById.mockResolvedValue(null);

      await expect(
        service.createLead(tenantId, { academicYearId, appliedClassId }),
      ).rejects.toThrow("Academic year not found");
    });

    it("should throw 404 AppError if applied class does not exist", async () => {
      mockAcademicYearRepo.findById.mockResolvedValue({ id: academicYearId });
      mockClassRepo.findById.mockResolvedValue(null);

      await expect(
        service.createLead(tenantId, { academicYearId, appliedClassId }),
      ).rejects.toThrow("Applied class not found");
    });
  });

  describe("getAllLeads", () => {
    it("should return paginated and filtered leads list from repository", async () => {
      const query = { page: 1, limit: 10, search: "John", status: "new" };
      const mockResult = {
        total: 1,
        page: 1,
        limit: 10,
        pages: 1,
        data: [{ id: leadId, firstName: "John" }],
      };

      mockLeadRepo.searchLeads.mockResolvedValue(mockResult);

      const result = await service.getAllLeads(tenantId, query);

      expect(mockLeadRepo.searchLeads).toHaveBeenCalledWith(tenantId, query);
      expect(result).toEqual(mockResult);
    });
  });

  describe("getLeadById", () => {
    it("should return single lead by id", async () => {
      mockLeadRepo.findLeadById.mockResolvedValue({ id: leadId, firstName: "John" });

      const result = await service.getLeadById(leadId, tenantId);

      expect(mockLeadRepo.findLeadById).toHaveBeenCalledWith(leadId, tenantId);
      expect(result.id).toBe(leadId);
    });

    it("should throw 404 AppError if lead is not found", async () => {
      mockLeadRepo.findLeadById.mockResolvedValue(null);

      await expect(service.getLeadById(leadId, tenantId)).rejects.toThrow(
        "Admission lead not found",
      );
    });
  });

  describe("updateLeadStatus", () => {
    it("should update status and append entry to statusHistory", async () => {
      const mockLead = {
        id: leadId,
        status: "new",
        statusHistory: [{ status: "new", remarks: "Initial" }],
      };
      mockLeadRepo.findById.mockResolvedValue(mockLead);
      mockLeadRepo.update.mockResolvedValue([1]);
      mockLeadRepo.findLeadById.mockResolvedValue({ ...mockLead, status: "approved" });

      const result = await service.updateLeadStatus(
        leadId,
        tenantId,
        { status: "approved", remarks: "Verified" },
        { id: "user-admin-1" },
      );

      expect(mockLeadRepo.update).toHaveBeenCalled();
      expect(result.status).toBe("approved");
    });

    it("should throw AppError if status is invalid", async () => {
      await expect(
        service.updateLeadStatus(leadId, tenantId, { status: "invalid_status" }),
      ).rejects.toThrow("Invalid status: invalid_status");
    });

    it("should throw AppError if status is set to converted directly", async () => {
      await expect(
        service.updateLeadStatus(leadId, tenantId, { status: "converted" }),
      ).rejects.toThrow("Status cannot be changed to 'converted' directly");
    });
  });

  describe("convertLeadToStudent", () => {
    const convertPayloadWithLogin = {
      admissionDate: "2026-08-13",
      sectionId,
      createLogin: true,
      email: "student@gmail.com",
      password: "password123",
    };

    const convertPayloadNoLogin = {
      admissionDate: "2026-08-13",
      sectionId,
      createLogin: false,
    };

    const approvedLead = {
      id: leadId,
      status: "approved",
      academicYearId,
      appliedClassId,
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: "2015-05-10",
      gender: "male",
      guardianName: "Robert Doe",
      guardianPhone: "9876543210",
      guardianEmail: "robert@gmail.com",
      statusHistory: [],
      update: vi.fn().mockResolvedValue(true),
    };

    it("should successfully convert an approved lead to a student with user login (createLogin: true)", async () => {
      mockLeadRepo.findById.mockResolvedValue(approvedLead);
      mockSectionRepo.findById.mockResolvedValue({ id: sectionId });
      mockUserService.createUser.mockResolvedValue({ id: "user-student-1" });
      mockRoleService.getAllRoles.mockResolvedValue([{ id: "role-student-1", slug: "student" }]);
      mockUserRoleService.assignRoleToUser.mockResolvedValue(true);
      mockStudentRepo.create.mockResolvedValue({ id: "student-uuid-1", admissionNumber: "ADM-2026-123456" });
      mockGuardianService.resolveGuardian.mockResolvedValue({ id: "guardian-uuid-1" });
      mockGuardianService.attachStudents.mockResolvedValue(true);
      mockEnrollmentRepo.create.mockResolvedValue(true);
      mockLeadRepo.findLeadById.mockResolvedValue({ ...approvedLead, status: "converted", convertedStudentId: "student-uuid-1" });
      mockStudentRepo.findById.mockResolvedValue({ id: "student-uuid-1", firstName: "John" });

      const result = await service.convertLeadToStudent(
        leadId,
        tenantId,
        convertPayloadWithLogin,
        { id: "admin-user-id" },
      );

      expect(mockUserService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: "student@gmail.com" }),
        expect.any(Object),
      );
      expect(mockStudentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-student-1", firstName: "John" }),
        expect.any(Object),
      );
      expect(mockGuardianService.resolveGuardian).toHaveBeenCalled();
      expect(mockEnrollmentRepo.create).toHaveBeenCalled();
      expect(result.admissionLead.status).toBe("converted");
      expect(result.student.id).toBe("student-uuid-1");
    });

    it("should successfully convert an approved lead without user login (createLogin: false)", async () => {
      mockLeadRepo.findById.mockResolvedValue(approvedLead);
      mockSectionRepo.findById.mockResolvedValue({ id: sectionId });
      mockStudentRepo.create.mockResolvedValue({ id: "student-uuid-2", admissionNumber: "ADM-2026-654321" });
      mockGuardianService.resolveGuardian.mockResolvedValue({ id: "guardian-uuid-1" });
      mockGuardianService.attachStudents.mockResolvedValue(true);
      mockEnrollmentRepo.create.mockResolvedValue(true);
      mockLeadRepo.findLeadById.mockResolvedValue({ ...approvedLead, status: "converted", convertedStudentId: "student-uuid-2" });
      mockStudentRepo.findById.mockResolvedValue({ id: "student-uuid-2", firstName: "John" });

      const result = await service.convertLeadToStudent(
        leadId,
        tenantId,
        convertPayloadNoLogin,
        { id: "admin-user-id" },
      );

      expect(mockUserService.createUser).not.toHaveBeenCalled();
      expect(mockStudentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: null, firstName: "John" }),
        expect.any(Object),
      );
      expect(result.student.id).toBe("student-uuid-2");
    });

    it("should throw error if admission lead is not approved", async () => {
      mockLeadRepo.findById.mockResolvedValue({ ...approvedLead, status: "new" });

      await expect(
        service.convertLeadToStudent(leadId, tenantId, convertPayloadNoLogin),
      ).rejects.toThrow("Only approved admission leads can be converted");
    });

    it("should throw error if createLogin is true but email/password are missing", async () => {
      mockLeadRepo.findById.mockResolvedValue(approvedLead);
      mockSectionRepo.findById.mockResolvedValue({ id: sectionId });

      await expect(
        service.convertLeadToStudent(leadId, tenantId, {
          sectionId,
          createLogin: true,
        }),
      ).rejects.toThrow("Email and password are required when createLogin is true");
    });
  });
});
