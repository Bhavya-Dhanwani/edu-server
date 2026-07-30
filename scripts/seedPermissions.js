import sequelize from "../config/db.js";
import "../models/index.js";
import { PermissionRepository } from "../repositories/permission.repository.js";

// ============================================================
// SINGLE SOURCE OF TRUTH: checkPermission() calls in routes.
// Route names WIN over any documentation names.
// module  → from official documentation (Postman collection, sideBarConfig.ts)
// description → from official documentation where available, inferred otherwise
// ============================================================
//
// Documented module names:
//   "rbac"      → roles, permissions          (Postman: assign-permissions collection)
//   "security"  → users                       (sideBarConfig.ts: Security section)
//   "tenants"   → tenants                     (sideBarConfig.ts: Admin section)
//   "hr"        → staff                       (sideBarConfig.ts: Human Resources section)
//   "academics" → students, academic years,   (Postman: rbac-routes collection)
//                 classes, sections, subjects,
//                 class-subjects, enrollments,
//                 attendance
//   "finance"   → fee-head, fee-structure,    (sideBarConfig.ts: Finance & Fees section)
//                 fee-structure-item
// ============================================================

const permissions = [
  // ─── RBAC: Roles ───────────────────────────────────────────
  {
    name: "create:roles",
    action: "create",
    resource: "roles",
    module: "rbac",
    description: "Create a new role within the tenant",
  },
  {
    name: "read:roles",
    action: "read",
    resource: "roles",
    module: "rbac",
    description: "Read and list roles within the tenant",
  },
  {
    name: "update:roles",
    action: "update",
    resource: "roles",
    module: "rbac",
    description: "Update role details and assign permissions to a role",
  },
  {
    name: "assign:role",
    action: "assign",
    resource: "role",
    module: "rbac",
    description: "Assign or revoke a role from a user",
  },

  // ─── RBAC: Permissions ─────────────────────────────────────
  {
    name: "create:permission",
    action: "create",
    resource: "permission",
    module: "rbac",
    description: "Create a new permission record",
  },
  {
    name: "read:permission",
    action: "read",
    resource: "permission",
    module: "rbac",
    description: "Read and list permission records",
  },

  // ─── Users ─────────────────────────────────────────────────
  {
    name: "create:user",
    action: "create",
    resource: "user",
    module: "security",
    description: "Create a new user account",
  },
  {
    name: "read:user",
    action: "read",
    resource: "user",
    module: "security",
    description: "Read and list user accounts",
  },
  {
    name: "update:user",
    action: "update",
    resource: "user",
    module: "security",
    description: "Update user account details",
  },
  {
    name: "delete:user",
    action: "delete",
    resource: "user",
    module: "security",
    description: "Soft-delete a user account",
  },

  // ─── Tenants ───────────────────────────────────────────────
  {
    name: "read:tenants",
    action: "read",
    resource: "tenants",
    module: "tenants",
    description: "Read and list tenant organisations",
  },
  {
    name: "update:tenants",
    action: "update",
    resource: "tenants",
    module: "tenants",
    description: "Update tenant profile, status, branding, and provisioning",
  },
  {
    name: "delete:tenants",
    action: "delete",
    resource: "tenants",
    module: "tenants",
    description: "Archive (soft-delete) a tenant organisation",
  },

  // ─── Staff ─────────────────────────────────────────────────
  {
    name: "create:staff",
    action: "create",
    resource: "staff",
    module: "hr",
    description: "Create a new staff member profile",
  },
  {
    name: "read:staff",
    action: "read",
    resource: "staff",
    module: "hr",
    description: "Read and list staff member profiles",
  },
  {
    name: "update:staff",
    action: "update",
    resource: "staff",
    module: "hr",
    description: "Update a staff member's profile",
  },
  {
    name: "delete:staff",
    action: "delete",
    resource: "staff",
    module: "hr",
    description: "Delete a staff member profile",
  },

  // ─── Students ──────────────────────────────────────────────
  {
    name: "create:students",
    action: "create",
    resource: "students",
    module: "academics",
    description: "Enrol a new student into the system",
  },
  {
    name: "read:students",
    action: "read",
    resource: "students",
    module: "academics",
    description: "Read and list student records",
  },
  {
    name: "update:students",
    action: "update",
    resource: "students",
    module: "academics",
    description: "Update a student's profile and information",
  },
  {
    name: "delete:students",
    action: "delete",
    resource: "students",
    module: "academics",
    description: "Remove a student record from the system",
  },

  // ─── Academic: Academic Years ───────────────────────────────
  {
    name: "create:academicyears",
    action: "create",
    resource: "academicyears",
    module: "academics",
    description: "Create a new academic year",
  },
  {
    name: "read:academicyears",
    action: "read",
    resource: "academicyears",
    module: "academics",
    description: "Read and list academic years",
  },
  {
    name: "update:academicyears",
    action: "update",
    resource: "academicyears",
    module: "academics",
    description: "Update, lock, or unlock an academic year",
  },
  {
    name: "delete:academicyears",
    action: "delete",
    resource: "academicyears",
    module: "academics",
    description: "Delete an academic year",
  },

  // ─── Academic: Classes ─────────────────────────────────────
  {
    name: "create:classes",
    action: "create",
    resource: "classes",
    module: "academics",
    description: "Create a new class",
  },
  {
    name: "read:classes",
    action: "read",
    resource: "classes",
    module: "academics",
    description: "Read and list classes, including classes with their sections",
  },
  {
    name: "update:classes",
    action: "update",
    resource: "classes",
    module: "academics",
    description: "Update a class record",
  },
  {
    name: "delete:classes",
    action: "delete",
    resource: "classes",
    module: "academics",
    description: "Delete a class record",
  },

  // ─── Academic: Sections ────────────────────────────────────
  {
    name: "create:sections",
    action: "create",
    resource: "sections",
    module: "academics",
    description: "Create a new section within a class",
  },
  {
    name: "read:sections",
    action: "read",
    resource: "sections",
    module: "academics",
    description: "Read and list sections",
  },
  {
    name: "update:sections",
    action: "update",
    resource: "sections",
    module: "academics",
    description: "Update a section record",
  },
  {
    name: "delete:sections",
    action: "delete",
    resource: "sections",
    module: "academics",
    description: "Delete a section record",
  },

  // ─── Academic: Subjects ────────────────────────────────────
  // Route name: create:subject (NOT create:subjects — route wins)
  {
    name: "create:subject",
    action: "create",
    resource: "subject",
    module: "academics",
    description: "Create a new subject master record",
  },
  {
    name: "read:subject",
    action: "read",
    resource: "subject",
    module: "academics",
    description: "Read and list subjects",
  },
  {
    name: "update:subject",
    action: "update",
    resource: "subject",
    module: "academics",
    description: "Update a subject master record",
  },
  {
    name: "delete:subject",
    action: "delete",
    resource: "subject",
    module: "academics",
    description: "Delete a subject master record",
  },

  // ─── Academic: Class-Subject Mapping ───────────────────────
  // Route name: create:class-subject (NOT create:class-subjects — route wins)
  {
    name: "create:class-subject",
    action: "create",
    resource: "class-subject",
    module: "academics",
    description: "Assign subjects to a class",
  },
  {
    name: "update:class-subject",
    action: "update",
    resource: "class-subject",
    module: "academics",
    description: "Update a class-subject assignment",
  },
  {
    name: "delete:class-subject",
    action: "delete",
    resource: "class-subject",
    module: "academics",
    description: "Remove a subject assignment from a class",
  },
  {
    name: "read:class-subject",
    action: "read",
    resource: "class-subject",
    module: "academics",
    description: "Read and list class-subject assignments",
  },  

  // ─── Enrollments ───────────────────────────────────────────
  {
    name: "create:enrollments",
    action: "create",
    resource: "enrollments",
    module: "academics",
    description: "Enrol a student into a section for an academic year",
  },
  {
    name: "read:enrollments",
    action: "read",
    resource: "enrollments",
    module: "academics",
    description: "Read and list student section enrolments",
  },
  {
    name: "update:enrollments",
    action: "update",
    resource: "enrollments",
    module: "academics",
    description: "Update or transfer a student's section enrolment",
  },
  {
    name: "delete:enrollments",
    action: "delete",
    resource: "enrollments",
    module: "academics",
    description: "Remove a student section enrolment record",
  },

  // ─── Attendance ────────────────────────────────────────────
  {
    name: "create:attendance",
    action: "create",
    resource: "attendance",
    module: "attendance",
    description: "Mark daily attendance for students",
  },
  {
    name: "read:attendance",
    action: "read",
    resource: "attendance",
    module: "attendance",
    description: "View attendance records",
  },
  {
    name: "update:attendance",
    action: "update",
    resource: "attendance",
    module: "attendance",
    description: "Correct or update a daily attendance record",
  },
  {
    name: "delete:attendance",
    action: "delete",
    resource: "attendance",
    module: "attendance",
    description: "Delete a daily attendance record",
  },
  // ─── Exams ────────────────────────────────────

  {
    name: "create:exams",
    action: "create",
    resource: "exams",
    module: "examination",
    description: "Create exams",
  },
  {
    name: "read:exams",
    action: "read",
    resource: "exams",
    module: "examination",
    description: "Read exams",
  },
  {
    name: "update:exams",
    action: "update",
    resource: "exams",
    module: "examination",
    description: "Update exams",
  },
  {
    name: "delete:exams",
    action: "delete",
    resource: "exams",
    module: "examination",
    description: "Delete exams",
  },

  // ─── Teacher Assignment ───────────────────────────────────
  {
    name: "create:teacher-assignment",
    action: "create",
    resource: "teacher-assignment",
    module: "academics",
    description: "Create teacher assignment",
  },
  {
    name: "read:teacher-assignment",
    action: "read",
    resource: "teacher-assignment",
    module: "academics",
    description: "Read teacher assignment",
  },
  {
    name: "update:teacher-assignment",
    action: "update",
    resource: "teacher-assignment",
    module: "academics",
    description: "Update teacher assignment",
  },
  {
    name: "delete:teacher-assignment",
    action: "delete",
    resource: "teacher-assignment",
    module: "academics",
    description: "Delete teacher assignment",
  },
  // ─── Attendance Periods ────────────────────────────────────
  {
    name: "create:attendance-periods",
    action: "create",
    resource: "attendance-periods",
    module: "attendance",
    description: "Mark period-wise attendance for students",
  },
  {
    name: "read:attendance-periods",
    action: "read",
    resource: "attendance-periods",
    module: "attendance",
    description: "View attendance periods",
  },
  {
    name: "update:attendance-periods",
    action: "update",
    resource: "attendance-periods",
    module: "attendance",
    description: "Correct or update a period attendance record",
  },
  {
    name: "delete:attendance-periods",
    action: "delete",
    resource: "attendance-periods",
    module: "attendance",
    description: "Delete a period attendance record",
  },

  // ─── Fee Structure: Fee Heads ──────────────────────────────
  // Route name: create:fee-head (NOT create:fee-heads — route wins)
  {
    name: "create:fee-head",
    action: "create",
    resource: "fee-head",
    module: "finance",
    description: "Create a new fee head (e.g. Tuition Fee, Library Fee)",
  },
  {
    name: "update:fee-head",
    action: "update",
    resource: "fee-head",
    module: "finance",
    description: "Update a fee head record",
  },
  {
    name: "delete:fee-head",
    action: "delete",
    resource: "fee-head",
    module: "finance",
    description: "Delete a fee head record",
  },

  // ─── Fee Structure ─────────────────────────────────────────
  {
    name: "create:fee-structure",
    action: "create",
    resource: "fee-structure",
    module: "finance",
    description: "Create a new fee structure for a class and academic year",
  },
  {
    name: "update:fee-structure",
    action: "update",
    resource: "fee-structure",
    module: "finance",
    description: "Update a fee structure record",
  },
  {
    name: "delete:fee-structure",
    action: "delete",
    resource: "fee-structure",
    module: "finance",
    description: "Delete a fee structure (including all its items)",
  },

  // ─── Fee Structure Items ───────────────────────────────────
  {
    name: "create:fee-structure-item",
    action: "create",
    resource: "fee-structure-item",
    module: "finance",
    description: "Add a fee head to a fee structure (create a line item)",
  },
  {
    name: "update:fee-structure-item",
    action: "update",
    resource: "fee-structure-item",
    module: "finance",
    description:
      "Update the amount or optional flag of a fee structure line item",
  },
  {
    name: "delete:fee-structure-item",
    action: "delete",
    resource: "fee-structure-item",
    module: "finance",
    description: "Remove a fee head line item from a fee structure",
  },
  // ───Notice ───────────────────────────────────
  {
    name: "create:notices",
    action: "create",
    resource: "notices",
    module: "communication",
    description: "Create notices",
  },
  {
    name: "read:notices",
    action: "read",
    resource: "notices",
    module: "communication",
    description: "Read notices",
  },
  {
    name: "update:notices",
    action: "update",
    resource: "notices",
    module: "communication",
    description: "Update notices",
  },
  {
    name: "delete:notices",
    action: "delete",
    resource: "notices",
    module: "communication",
    description: "Delete notices",
  },
  // ───Guardian───────────────────────────────────
  {
    name: "create:guardian",
    action: "create",
    resource: "guardian",
    module: "academics",
    description: "Create guardian",
  },
  {
    name: "read:guardian",
    action: "read",
    resource: "guardian",
    module: "academics",
    description: "Read guardian",
  },
  {
    name: "update:guardian",
    action: "update",
    resource: "guardian",
    module: "academics",
    description: "Update guardian",
  },
  {
    name: "delete:guardian",
    action: "delete",
    resource: "guardian",
    module: "academics",
    description: "Delete guardian",
  },
  // ───Admission Lead───────────────────────────────────
  {
    name: "create:admission_lead",
    action: "create",
    resource: "admission_lead",
    module: "admission",
    description: "Create admission lead",
  },
  {
    name: "read:admission_lead",
    action: "read",
    resource: "admission_lead",
    module: "admission",
    description: "Read admission lead",
  },
  {
    name: "update:admission_lead",
    action: "update",
    resource: "admission_lead",
    module: "admission",
    description: "Update admission lead",
  },
  {
    name: "delete:admission_lead",
    action: "delete",
    resource: "admission_lead",
    module: "admission",
    description: "Delete admission lead",
  },
  // ───infrastructure───────────────────────────────────
  {
    name: "create:infrastructure",
    action: "create",
    resource: "infrastructure",
    module: "platform",
    description: "Create infrastructure",
  },
  {
    name: "read:infrastructure",
    action: "read",
    resource: "infrastructure",
    module: "platform",
    description: "Read infrastructure",
  },
  {
    name: "update:infrastructure",
    action: "update",
    resource: "infrastructure",
    module: "platform",
    description: "Update infrastructure",
  },
  {
    name: "delete:infrastructure",
    action: "delete",
    resource: "infrastructure",
    module: "platform",
    description: "Delete infrastructure",
  },
  // ───payroll───────────────────────────────────
  {
    name: "create:payroll",
    action: "create",
    resource: "payroll",
    module: "finance",
    description: "Create payroll",
  },
  {
    name: "read:payroll",
    action: "read",
    resource: "payroll",
    module: "finance",
    description: "Read payroll",
  },
  {
    name: "update:payroll",
    action: "update",
    resource: "payroll",
    module: "finance",
    description: "Update payroll",
  },
  {
    name: "delete:payroll",
    action: "delete",
    resource: "payroll",
    module: "finance",
    description: "Delete payroll",
  },
  // ─── invoices ───────────────────────────────────
  {
    name: "create:invoices",
    action: "create",
    resource: "invoices",
    module: "finance",
    description: "Create invoices",
  },
  {
    name: "read:invoices",
    action: "read",
    resource: "invoices",
    module: "finance",
    description: "Read invoices",
  },
  {
    name: "update:invoices",
    action: "update",
    resource: "invoices",
    module: "finance",
    description: "Update invoices",
  },
  {
    name: "delete:invoices",
    action: "delete",
    resource: "invoices",
    module: "finance",
    description: "Delete invoices",
  },
  // ─── fees ───────────────────────────────────
  {
    name: "create:fees",
    action: "create",
    resource: "fees",
    module: "finance",
    description: "Create fees",
  },
  {
    name: "read:fees",
    action: "read",
    resource: "fees",
    module: "finance",
    description: "Read fees",
  },
  {
    name: "update:fees",
    action: "update",
    resource: "fees",
    module: "finance",
    description: "Update fees",
  },
  {
    name: "delete:fees",
    action: "delete",
    resource: "fees",
    module: "finance",
    description: "Delete fees",
  },
];

const seedPermissions = async () => {
  const transaction = await sequelize.transaction();

  try {
    console.log("🚀 Starting Permission seeding...");

    const permissionRepo = new PermissionRepository();

    for (const permission of permissions) {
      const existing = await permissionRepo.findByName(permission.name);

      if (existing) {
        console.log(`⏭️  ${permission.name} already exists — skipping`);
        continue;
      }

      await permissionRepo.create(permission, { transaction });

      console.log(`✅ ${permission.name} created`);
    }

    await transaction.commit();

    console.log("\n🎉 Permission seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    await transaction.rollback();

    console.error("❌ Permission seeding failed");
    console.error(error);

    process.exit(1);
  }
};

seedPermissions();
