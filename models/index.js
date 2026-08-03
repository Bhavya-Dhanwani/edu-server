import sequelize from "../config/db.js";

// --- Core & Billing ---
import Tenant from "./Tenant.js";
import Plan from "./Plan.js";
import Subscription from "./Subscription.js";

// --- Auth & RBAC ---
import User from "./Users.js";
import Role from "./Role.js";
import { Student } from "./Students.js";
import { Permission } from "./Permission.js";
import { Staff } from "./Staff.js";
import { AcademicYear } from "./Academic/AcademicYear.js";
import { Class } from "./Academic/Class.js";
import { Section } from "./Academic/Section.js";
import StudentSectionEnrollment from "./StudentSectionEnrollment.js";
import TeacherSubjectAssignment from "./TeacherSubjectAssignment.js";
import { Guardian } from "./Guardian.js";
import { UserRole } from "./UserRole.js";
import { RolePermission } from "./RolePermission.js";
import StudentGuardianMap from "./StudentGaurdianMap.js";
// import UserRole from './UserRole.js';
// import RolePermission from './RolePermission.js';

// // --- Academic (Sub-folder) ---
// import AcademicYear from './Academic/AcademicYear.js';
// import Class from './Academic/Class.js';
// import Section from './Academic/Section.js';
import { SubjectMaster, ClassSubject } from "./Academic/Subject.js";

// // --- Users & Relationships ---
// import Student from './Students.js';
// import Staff from './Staff.js';
// import Guardian from './Guardian.js';
// import StudentSectionEnrollment from './StudentSectionEnro.js'; // Note: matches your screenshot
// import StudentGuardianMap from './StudentGaurdianMa.js'; // Note: matches your screenshot
// import TeacherSubjectAssignment from './TeacherSubjectAssi.js'; // Note: matches your screenshot

// // --- Infrastructure ---
import { Room, Timetable, TimetableSlot } from "./Infrastructure.js";
import { WebhookEndpoint, BiometricPunch } from "./platform/Infrastructure.js";

// --- Fee Management ---
import { FeeHead } from "./FeeStructure/FeeHead.js";
import { FeeStructure } from "./FeeStructure/FeeStructure.js";
import { FeeStructureItem } from "./FeeStructure/FeeStructureItem.js";

// --- Attendance & Attendance Period ---
import { Attendance } from "./Attendance.js";
import { AttendancePeriod } from "./AttendancePeriod.js";

import TenantProvisioningStep from "./TenantProvisioningStep.js";

// ==========================================
// 1. TENANT & BILLING ASSOCIATIONS
// ==========================================
Tenant.hasMany(Subscription, { foreignKey: "tenantId", as: "subscriptions" });
Subscription.belongsTo(Tenant, { foreignKey: "tenantId", as: "organization" });

Plan.hasMany(Subscription, { foreignKey: "planId", as: "activeSubscriptions" });
Subscription.belongsTo(Plan, { foreignKey: "planId", as: "planDetails" });

// ==========================================
// 2. AUTH & RBAC (The Many-to-Many logic)
// ==========================================
User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: "userId",
  as: "roles",
});
Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: "roleId",
  as: "users",
});

Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: "roleId",
  as: "permissions",
});
Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: "permissionId",
  as: "roles",
});

// Linking users to tenants
Tenant.hasMany(User, { foreignKey: "tenantId", as: "members" });
User.belongsTo(Tenant, { foreignKey: "tenantId", as: "organization" });

// ==========================================
// USER-ROLE JUNCTION TABLE ASSOCIATIONS
// ==========================================
UserRole.belongsTo(User, { foreignKey: "userId", as: "user" });
UserRole.belongsTo(Role, { foreignKey: "roleId", as: "role" });
UserRole.belongsTo(AcademicYear, {
  foreignKey: "academicYearId",
  as: "academicYear",
});
UserRole.belongsTo(User, { foreignKey: "assignedById", as: "assignedBy" });

// ==========================================
// 3. STUDENT & STAFF PROFILE LINKS
// ==========================================
User.hasOne(Student, { foreignKey: "userId", as: "studentProfile" });
Student.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasOne(Staff, { foreignKey: "userId", as: "staffProfile" });
Staff.belongsTo(User, { foreignKey: "userId", as: "user" });
Staff.belongsTo(Tenant, { foreignKey: "tenantId", as: "organization" });
Staff.hasMany(BiometricPunch, {
  foreignKey: "staffId",
  as: "biometricPunches",
});
BiometricPunch.belongsTo(Staff, { foreignKey: "staffId", as: "staff" });

User.hasOne(Guardian, { foreignKey: "userId", as: "guardianProfile" });
Guardian.belongsTo(User, { foreignKey: "userId", as: "user" });
Guardian.belongsTo(Tenant, { foreignKey: "tenantId", as: "organization" });

Student.belongsTo(Tenant, { foreignKey: "tenantId", as: "organization" });

// Student -> Sibling (self-referential)
Student.belongsTo(Student, { foreignKey: "siblingId", as: "sibling" });

// ==========================================
// 4. ACADEMIC & ENROLLMENT LOGIC
// ==========================================
// Tenant -> Academic Years
Tenant.hasMany(AcademicYear, { foreignKey: "tenantId" });
AcademicYear.belongsTo(Tenant, { foreignKey: "tenantId" });

// Class -> Section
Class.hasMany(Section, { foreignKey: "classId", as: "sections" });
Section.belongsTo(Class, { foreignKey: "classId", as: "class" });

// Class Teacher (User) -> Section
Section.belongsTo(User, { foreignKey: "classTeacherId", as: "classTeacher" });
User.hasMany(Section, { foreignKey: "classTeacherId", as: "sectionsAssigned" });

// Academic Year -> Section
Section.belongsTo(AcademicYear, {
  foreignKey: "academicYearId",
  as: "academicYear",
});
AcademicYear.hasMany(Section, { foreignKey: "academicYearId", as: "sections" });

// Student Enrollment (History)
Student.hasMany(StudentSectionEnrollment, {
  foreignKey: "studentId",
  as: "enrollments",
});
StudentSectionEnrollment.belongsTo(Student, {
  foreignKey: "studentId",
  as: "student",
});
StudentSectionEnrollment.belongsTo(Section, {
  foreignKey: "sectionId",
  as: "section",
});
StudentSectionEnrollment.belongsTo(AcademicYear, {
  foreignKey: "academicYearId",
  as: "academicYear",
});

// Teacher Assignments
TeacherSubjectAssignment.belongsTo(Staff, { foreignKey: "staffId" });

// ==========================================
// 6. SUBJECT & CLASS SUBJECT MAPPINGS
// ==========================================
// SubjectMaster -> ClassSubject
SubjectMaster.hasMany(ClassSubject, {
  foreignKey: "subjectMasterId",
  as: "classSubjects",
});
ClassSubject.belongsTo(SubjectMaster, {
  foreignKey: "subjectMasterId",
  as: "subject",
});

// Class -> ClassSubject
Class.hasMany(ClassSubject, { foreignKey: "classId", as: "subjects" });
ClassSubject.belongsTo(Class, { foreignKey: "classId", as: "class" });

// ==========================================
// 7. FAMILY TREE (Guardians)
// ==========================================
Student.belongsToMany(Guardian, {
  through: StudentGuardianMap,
  foreignKey: "studentId",
  as: "guardians",
});
Guardian.belongsToMany(Student, {
  through: StudentGuardianMap,
  foreignKey: "guardianId",
  as: "students",
});
Guardian.hasMany(StudentGuardianMap, {
  foreignKey: "guardianId",
  as: "studentMappings",
});

// ==========================================
// 6. FEE MANAGEMENT
// ==========================================
// FeeHead relations
Tenant.hasMany(FeeHead, { foreignKey: "tenantId", as: "feeHeads" });
FeeHead.belongsTo(Tenant, { foreignKey: "tenantId", as: "organization" });

// FeeStructure relations
Tenant.hasMany(FeeStructure, { foreignKey: "tenantId", as: "feeStructures" });
FeeStructure.belongsTo(Tenant, { foreignKey: "tenantId", as: "organization" });
FeeStructure.belongsTo(AcademicYear, {
  foreignKey: "academicYearId",
  as: "academicYear",
});
AcademicYear.hasMany(FeeStructure, {
  foreignKey: "academicYearId",
  as: "feeStructures",
});
FeeStructure.belongsTo(Class, { foreignKey: "classId", as: "class" });
Class.hasMany(FeeStructure, { foreignKey: "classId", as: "feeStructures" });

// FeeStructureItem (Mapping) relations
FeeStructure.hasMany(FeeStructureItem, {
  foreignKey: "feeStructureId",
  as: "items",
});
FeeStructureItem.belongsTo(FeeStructure, {
  foreignKey: "feeStructureId",
  as: "feeStructure",
});
FeeHead.hasMany(FeeStructureItem, {
  foreignKey: "feeHeadId",
  as: "structures",
});
FeeStructureItem.belongsTo(FeeHead, { foreignKey: "feeHeadId", as: "feeHead" });

// ==========================================
// 6. ATTENDANCE & ATTENDANCE PERIOD
// ==========================================
// Attendance Relationships
Student.hasMany(Attendance, {
  foreignKey: "studentId",
  as: "attendanceRecords",
});
Attendance.belongsTo(Student, { foreignKey: "studentId", as: "student" });
Attendance.belongsTo(Section, { foreignKey: "sectionId", as: "section" });
Attendance.belongsTo(AcademicYear, {
  foreignKey: "academicYearId",
  as: "academicYear",
});
Attendance.belongsTo(User, { foreignKey: "markedById", as: "markedBy" });
Attendance.belongsTo(User, { foreignKey: "correctedById", as: "correctedBy" });

// AttendancePeriod Relationships
Student.hasMany(AttendancePeriod, {
  foreignKey: "studentId",
  as: "periodAttendanceRecords",
});
AttendancePeriod.belongsTo(Student, { foreignKey: "studentId", as: "student" });
AttendancePeriod.belongsTo(TimetableSlot, {
  foreignKey: "timetableSlotId",
  as: "timetableSlot",
});
AttendancePeriod.belongsTo(User, { foreignKey: "markedById", as: "markedBy" });

Tenant.hasMany(TenantProvisioningStep, {
  foreignKey: "tenantId",
  as: "provisioningSteps",
});

TenantProvisioningStep.belongsTo(Tenant, {
  foreignKey: "tenantId",
  as: "tenant",
});

Tenant.addScope("active", { where: { status: "active" } });

export {
  sequelize,
  Tenant,
  Plan,
  Subscription,
  User,
  Role,
  Permission,
  UserRole,
  RolePermission,
  AcademicYear,
  Class,
  Section,
  SubjectMaster,
  ClassSubject,
  Student,
  Staff,
  Guardian,
  StudentSectionEnrollment,
  StudentGuardianMap,
  TeacherSubjectAssignment,
  Room,
  Timetable,
  TimetableSlot,
  Attendance,
  AttendancePeriod,
  WebhookEndpoint,
  BiometricPunch,
  FeeHead,
  FeeStructure,
  FeeStructureItem,
  TenantProvisioningStep, 
};
