export const ADMIN_PERMISSIONS = [
  "*", // agar tumhara authorization wildcard support karta hai
  // ya agar wildcard use nahi hota to
  "create:students",
  "read:students",
  "update:students",
  "delete:students",

  "create:classes",
  "read:classes",
  "update:classes",
  "delete:classes",

  "create:sections",
  "read:sections",
  "update:sections",
  "delete:sections",

  "create:subject",
  "update:subject",
  "delete:subject",
  "read:subject",

  "create:class-subject",
  "update:class-subject",
  "delete:class-subject",
  "read:class-subject",

  "create:academicyears",
  "read:academicyears",
  "update:academicyears",
  "delete:academicyears",

  "create:attendance",
  "update:attendance",
  "delete:attendance",
  "read:attendance",

  "create:attendance-periods",
  "update:attendance-periods",
  "delete:attendance-periods",
  "read:attendance-periods",

  "create:staff",
  "read:staff",
  "update:staff",
  "delete:staff",

  "create:user",
  "read:user",
  "update:user",
  "delete:user",

  "create:roles",
  "read:roles",
  "update:roles",
  "assign:role",

  "create:permission",
  "read:permission",

  "create:fee-head",
  "update:fee-head",
  "delete:fee-head",

  "create:fee-structure",
  "update:fee-structure",
  "delete:fee-structure",

  "create:fee-structure-item",
  "update:fee-structure-item",
  "delete:fee-structure-item",

  "read:tenants",
  "update:tenants",
  "delete:tenants",

  "create:exams",
  "read:exams",
  "update:exams",
  "delete:exams",

  "create:teacher-assignment",
  "read:teacher-assignment",
  "update:teacher-assignment",
  "delete:teacher-assignment",

  "create:guardian",
  "read:guardian",
  "update:guardian",
  "delete:guardian",

  "create:notices",
  "read:notices",
  "update:notices",
  "delete:notices",

  "create:fees",
  "read:fees",
  "update:fees",
  "delete:fees",

  "create:invoices",
  "read:invoices",
  "update:invoices",
  "delete:invoices",

  "create:payroll",
  "read:payroll",
  "update:payroll",
  "delete:payroll",

  "create:infrastructure",
  "read:infrastructure",
  "update:infrastructure",
  "delete:infrastructure",

  "create:admission_lead",
  "read:admission_lead",
  "update:admission_lead",
  "delete:admission_lead",

  "create:enrollments",
  "read:enrollments",
  "update:enrollments",
  "delete:enrollments",
];

export const ROLE_MASTER_CONFIG = {
  teacher: {
    name: "Teacher",
    roleType: "staff",
    hierarchyLevel: 5,
    permissions: [
      // "ce3b9446-a3ca-4b7f-a0dd-854762fe2936", // read:students
      // "38b1ae16-5268-4d18-89fd-977c89147c05", // create:attendance
      // "5bb30b18-4d14-4844-a5d4-643cb93d45f2", // read:attendance
      // "c55f0a1c-60ac-4488-a6a3-ea065626e09b", // update:attendance
      // "317c6866-2476-48a6-894e-bb9e2822a949", // create:exams
      // "52b15983-cdb9-40be-8b11-6a0881601e36", // read:exams
      // "9fc6e4aa-e556-43d3-99c3-3bd3ba24abe0", // update:exams
      // "b1ebbe15-be21-43a4-a5e9-9d3f5ac0fe8d", // read:subjects
      // "9a07b60f-9554-4115-a2ea-a901e0cf590d", // read:teacher_assignment
      // "7d027500-a04f-47ce-a505-773a80023e17", // create:notices
      // "5b97e53a-6f8f-4350-aeca-c92b0bf24b40"  // read:notices
      "read:students",
      "create:attendance",
      "read:attendance",
      "update:attendance",

      "create:exams",
      "read:exams",
      "update:exams",

      "read:subject",
      "read:teacher-assignment",

      "create:notices",
      "read:notices",
    ],
  },
  accountant: {
    name: "Accountant",
    roleType: "staff",
    hierarchyLevel: 6,
    permissions: [
      // "5103e362-3e2f-4289-86f2-6cf7f9020ced", // create:fees
      // "b61f9b6f-162d-481c-a1ad-016656881100", // read:fees
      // "e0170dfe-7901-48c0-8fe4-a314f1f1ada8", // update:fees
      // "7f77bf3e-b0a2-433e-beb7-a03ecd3a40d2", // create:invoices
      // "abf41646-c6fd-4e38-b7e1-bf4835086331", // read:invoices
      // "7e999423-1350-49f5-9fa1-4c6b6c06fde4", // delete:invoices
      // "b613dbe1-39ad-4789-a7e3-b83ba66f0ae6", // read:payroll
      // "5a4ec8f5-388a-4703-88ed-44e2d2693456", // update:payroll
      // "e9750422-b91b-48aa-82ce-e5a8bb07367c", // read:infrastructure
      // "5b97e53a-6f8f-4350-aeca-c92b0bf24b40", // read:notices

      "create:fees",
      "read:fees",
      "update:fees",

      "create:invoices",
      "read:invoices",
      "delete:invoices",

      "read:payroll",
      "update:payroll",

      "read:infrastructure",

      "read:notices",
    ],
  },
  librarian: {
    name: "Librarian",
    roleType: "staff",
    hierarchyLevel: 7,
    permissions: [
      // "e9750422-b91b-48aa-82ce-e5a8bb07367c", // read:infrastructure
      // "6034f8a2-2f20-4160-8a13-4f35b6df44d8", // create:infrastructure
      // "22ca2a93-afd5-4a82-85b4-e91a664d40b0", // update:infrastructure
      // "7d027500-a04f-47ce-a505-773a80023e17", // create:notices
      // "5b97e53a-6f8f-4350-aeca-c92b0bf24b40", // read:notices
      // "ce3b9446-a3ca-4b7f-a0dd-854762fe2936", // read:students

      "read:infrastructure",
      "create:infrastructure",
      "update:infrastructure",

      "create:notices",
      "read:notices",

      "read:students",
    ],
  },
  "admission-head": {
    name: "Admission Head",
    roleType: "staff",
    hierarchyLevel: 4,
    permissions: [
      // "505e9106-6514-41ba-b806-8f0f327f33fc", // create:admission_lead
      // "810e7fd8-2fa7-42e9-b08f-0961de95e743", // read:admission_lead
      // "99a931bb-e0a2-48ab-b1b3-c7ba18c1131e", // update:admission_lead
      // "fc30be4c-f7c7-48c7-a9b1-6e74b1614211", // delete:admission_lead
      // "388b816d-73c8-42ec-9499-5befdd38e646", // create:students
      // "ce3b9446-a3ca-4b7f-a0dd-854762fe2936", // read:students
      // "ba6b3877-3153-47c3-ab3c-db328dc79842", // create:guardian
      // "e167892e-467c-44bd-9376-aa612600e8f1", // read:guardian
      // "0a1e70da-7545-4e2a-80c3-badf4b0b65f3", // update:guardian
      // "7d027500-a04f-47ce-a505-773a80023e17", // create:notices
      // "5b97e53a-6f8f-4350-aeca-c92b0bf24b40", // read:notices

      "create:admission_lead",
      "read:admission_lead",
      "update:admission_lead",
      "delete:admission_lead",

      "create:students",
      "read:students",

      "create:guardian",
      "read:guardian",
      "update:guardian",

      "create:notices",
      "read:notices",
    ],
  },
  student: {
    name: "Student",
    roleType: "portal",
    hierarchyLevel: 10,
    permissions: [
      // "5bb30b18-4d14-4844-a5d4-643cb93d45f2", // read:attendance
      // "52b15983-cdb9-40be-8b11-6a0881601e36", // read:exams
      // "5b97e53a-6f8f-4350-aeca-c92b0bf24b40", // read:notices
      // "b61f9b6f-162d-481c-a1ad-016656881100", // read:fees

      "read:attendance",
      "read:exams",
      "read:notices",
      "read:fees",
    ],
  },
};
