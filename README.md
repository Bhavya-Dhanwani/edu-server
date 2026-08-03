# edu-server

A multi-tenant education SaaS backend built with **Node.js, Express 5, Sequelize 6, and PostgreSQL**.

This repository is open-sourced as a collaborative learning project for students. The core foundation — multi-tenancy, RBAC, academic structure, and student/staff profiles — is already built. Your job is to implement the pending features listed in this README.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 5 |
| ORM | Sequelize 6 |
| Database | PostgreSQL |
| Auth | AWS Cognito (cognitoSub on User) |
| Security | helmet, cors, morgan |

---

## Project Structure

```
edu-server/
├── app.js                        # Express app setup
├── index.js                      # Entry point — DB connect, sync, server start
├── config/
│   └── db.js                     # Sequelize instance (PostgreSQL + SSL + pool)
├── models/
│   ├── index.js                  # All model imports + associations
│   ├── withTenant.js             # Shared tenant field injector
│   ├── Tenant.js
│   ├── Plan.js
│   ├── Subscription.js
│   ├── User.js
│   ├── Role.js                   # type: platform | admin | staff | portal
│   ├── Permission.js
│   ├── RolePermission.js
│   ├── UserRole.js
│   ├── Academic/
│   │   ├── AcademicYear.js
│   │   ├── Class.js
│   │   ├── Section.js
│   │   ├── Subject.js
│   │   ├── Room.js
│   │   ├── Timetable.js
│   │   └── TimetableSlot.js
│   ├── Student.js
│   ├── Staff.js
│   ├── Guardian.js
│   ├── StudentGuardianMap.js
│   ├── StudentSectionEnrollment.js
│   └── TeacherSubjectAssignment.js
├── controllers/
│   ├── base.controller.js
│   └── tenant.controller.js
├── services/
│   └── tenant.service.js
├── repositories/
│   ├── base.repository.js
│   └── tenant.repository.js
├── router/
│   └── tenant.router.js
├── middlewares/
│   ├── error/
│   │   └── error.middleware.js   # globalErrorHandler — NOT yet wired in app.js
│   └── validators/
│       └── tenant.validator.js
└── utils/
    └── model-helper.js           # withTenant() helper
```

---

## Multi-Tenancy Design

Every business model is scoped to a tenant via `withTenant()`:

```js
// utils/model-helper.js
export const withTenant = (fields) => ({
  ...fields,
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,           // overridden to true on Role and User
    references: { model: "tenants", key: "id" },
  },
  customFields: { type: DataTypes.JSONB, defaultValue: {} },
  metadata:     { type: DataTypes.JSONB, defaultValue: {} },
});
```

**Two deliberate exceptions:**

- `User.tenantId` → nullable (super_admin has no school)
- `Role.tenantId` → nullable (platform-level system roles)

---

## Role System & Portal Routing

Roles have a `type` field that determines which portal a user can access:

| `type` | Portal | Who |
|---|---|---|
| `platform` | `/platform/*` | Super admins (SaaS team) |
| `admin` | `/admin/*` | School owner, principal |
| `staff` | `/staff/*` | Teachers, HR, accountant |
| `portal` | `/portal/*` | Students, parents |

On login the frontend reads `role.type` from the JWT and redirects accordingly. Each portal renders its own sidebar and only exposes permitted routes.

---

## What Is Already Built

### Foundation (complete)
- [x] Multi-tenant model with `withTenant()` helper
- [x] Tenant CRUD — `POST /register`, `GET /:id`, `PATCH /:id`, `DELETE /:id`
- [x] Plan and Subscription models
- [x] Base abstractions — `BaseRepository`, `BaseService`, `BaseController`
- [x] `AppError` + `catchAsync` error utilities
- [x] `globalErrorHandler` middleware (needs wiring)

### Auth & RBAC (models done, routes pending)
- [x] User model with `cognitoSub`, `userType`, `status`
- [x] Role model with `type` ENUM and `hierarchyLevel`
- [x] Permission model (`action:resource` format)
- [x] `UserRole` join table (academic-year-scoped, expiry support)
- [x] `RolePermission` join table

### Academic Structure (models done, routes pending)
- [x] AcademicYear
- [x] Class, Section, Subject
- [x] Room, Timetable, TimetableSlot (collision indexes in place)
- [x] StudentSectionEnrollment
- [x] TeacherSubjectAssignment

### People (models done, routes pending)
- [x] Student profile (full ERP fields)
- [x] Staff profile (payroll fields present)
- [x] Guardian + StudentGuardianMap

---

## Known Wiring Issues (Fix These First)

Before picking a feature, fix these so the project boots cleanly:

```
1. app.js          → mount tenant router
2. app.js          → wire globalErrorHandler
3. app.js          → add tenantId resolution middleware
4. Subscription.js → rename schoolId → tenantId
5. models/index.js → import and export Subject
6. Student.js      → add missing DataTypes import and default export
7. package.json    → add express-validator dependency
8. All routers     → add .js extensions to imports
9. base.controller.js → import catchAsync
```

---

## Pending Features — Open for Contribution

Each section below is a self-contained feature. Pick one, create a branch, implement it end-to-end (model → repository → service → controller → router → validator), and open a PR.

---

### PLATFORM SIDE

These features are managed by the SaaS team (super admins). They live under `/platform/*`.

---

#### FEATURE P-1 · Exam Management (Platform Config)

**What:** Super admins define global exam types and grading scale templates that schools can adopt.

**Why:** Schools should not have to configure exam types from scratch. The platform provides sensible defaults that tenants can override.

**Models to create:**

```js
// ExamType.js
// tenantId nullable (platform types are global)
{
  name:        STRING,      // "Unit Test", "Half-Yearly", "Annual"
  slug:        STRING,      // unique
  description: TEXT,
  isSystem:    BOOLEAN,     // platform-defined, cannot be deleted by tenant
}

// GradeScaleTemplate.js
// platform-level defaults
{
  name:      STRING,        // "CBSE Standard", "Percentage"
  scaleType: ENUM("percentage", "gpa", "cgpa", "letter"),
  rules:     JSONB,         // [{ label:"A+", minPct:90, maxPct:100, gradePoint:4.0 }]
  isDefault: BOOLEAN,
}
```

**Routes:**

```
POST   /platform/exam-types
GET    /platform/exam-types
PATCH  /platform/exam-types/:id
DELETE /platform/exam-types/:id

POST   /platform/grade-scale-templates
GET    /platform/grade-scale-templates
PATCH  /platform/grade-scale-templates/:id
```

**Acceptance criteria:**
- Only users with `role.type = "platform"` can access these routes
- `isSystem` records cannot be deleted
- Templates are available to all tenants via a public GET

---

#### FEATURE P-2 · Role Management (Platform)

**What:** Super admins create and manage global system roles and assign permissions to them.

**Why:** The Role and Permission models exist but there are no routes to manage them. This feature wires up the full CRUD layer.

**Routes:**

```
POST   /platform/roles
GET    /platform/roles
GET    /platform/roles/:id
PATCH  /platform/roles/:id
DELETE /platform/roles/:id          (blocked if isSystem = true)

POST   /platform/roles/:id/permissions      (assign permission to role)
DELETE /platform/roles/:id/permissions/:permId

GET    /platform/permissions                (list all permissions)
POST   /platform/permissions
```

**Business rules:**
- A user can only assign roles with `hierarchyLevel` strictly greater than their own level
- `isSystem` roles cannot be deleted or have their `hierarchyLevel` changed
- Changing a role's permissions takes effect on the next login (JWT re-issue)

---

#### FEATURE P-3 · Payroll Management (Platform Config)

**What:** Platform-level payroll component templates and tax slab configuration.

**Why:** Tax rules (TDS, PF, ESI, Professional Tax) vary by state and financial year. Defining them at the platform level means tenants inherit correct defaults.

**Models to create:**

```js
// PayrollComponent.js
// tenantId nullable = platform template
{
  name:          STRING,    // "Basic", "HRA", "PF Employee"
  componentType: ENUM("earning", "deduction"),
  calculationType: ENUM("flat", "percentage_of_basic", "percentage_of_gross"),
  defaultValue:  DECIMAL,
  isSystem:      BOOLEAN,
}

// TaxSlab.js
{
  financialYear: STRING,    // "2025-26"
  regime:        ENUM("old", "new"),
  slabs:         JSONB,     // [{ from:0, to:300000, rate:0 }, ...]
  state:         STRING,    // for Professional Tax slabs
}
```

**Routes:**

```
POST   /platform/payroll-components
GET    /platform/payroll-components
PATCH  /platform/payroll-components/:id

POST   /platform/tax-slabs
GET    /platform/tax-slabs
PATCH  /platform/tax-slabs/:id
```

---

### ADMIN SIDE

These features are used by school owners and principals. They live under `/admin/*`.

---

#### FEATURE A-1 · Exam Management (Tenant Level)

**What:** Principals create exam groups, schedule exams per subject/section, and manage marks entry.

**Models to create:**

```js
// ExamGroup.js  (tenant-scoped)
{
  academicYearId:   UUID FK,
  name:             STRING,       // "Half-Yearly Examination 2025"
  examTypeId:       UUID FK,      // → ExamType (platform)
  gradeScaleId:     UUID FK,
  startDate:        DATEONLY,
  endDate:          DATEONLY,
  weightagePercent: DECIMAL,
  isResultPublished: BOOLEAN,
  resultPublishedAt: DATE,
}

// ExamSchedule.js  (tenant-scoped)
{
  examGroupId: UUID FK,
  subjectId:   UUID FK,
  sectionId:   UUID FK,
  examDate:    DATEONLY,
  startTime:   TIME,
  duration:    INTEGER,           // minutes
  maxMarks:    INTEGER,
  passingMarks: INTEGER,
  roomId:      UUID FK nullable,
  isMarksEntryLocked: BOOLEAN,
}

// Mark.js  (tenant-scoped)
{
  studentId:      UUID FK,
  examScheduleId: UUID FK,
  marksObtainedRaw: INTEGER,      // stored ×100 to avoid float errors
  graceMarksRaw:    INTEGER,
  isAbsent:       BOOLEAN,
  teacherRemarks: TEXT,
  enteredById:    UUID FK,
  verifiedById:   UUID FK nullable,
}
// unique: (tenantId, studentId, examScheduleId)
```

**Routes:**

```
POST   /admin/exam-groups
GET    /admin/exam-groups
GET    /admin/exam-groups/:id
PATCH  /admin/exam-groups/:id

POST   /admin/exam-groups/:id/schedules
GET    /admin/exam-groups/:id/schedules
PATCH  /admin/exam-schedules/:id
POST   /admin/exam-schedules/:id/lock-marks

POST   /admin/marks/bulk          (batch upsert marks for one schedule)
GET    /admin/marks/:examScheduleId
```

**Business rules:**
- Marks can only be entered after `examDate`
- Once `isMarksEntryLocked = true`, no teacher can modify marks
- `marksObtainedRaw` must be between 0 and `maxMarks × 100`

---

#### FEATURE A-2 · Role Management (Tenant Level)

**What:** Principals create custom roles for their school (e.g. "Lab In-charge", "Sports Coach") and assign permissions.

**Routes:**

```
POST   /admin/roles
GET    /admin/roles
GET    /admin/roles/:id
PATCH  /admin/roles/:id
DELETE /admin/roles/:id           (blocked if isSystem = true)

POST   /admin/roles/:id/permissions
DELETE /admin/roles/:id/permissions/:permId

POST   /admin/users/:id/roles     (assign role to a user)
DELETE /admin/users/:id/roles/:roleId
```

**Business rules:**
- Tenant roles must have `tenantId` set (never null)
- Only roles with `type = "admin"` or `"staff"` or `"portal"` can be created by tenant admins
- `hierarchyLevel` of the new role must be greater than the assigning user's level

---

#### FEATURE A-3 · Payroll Management (Tenant Level)

**What:** HR admins run monthly payroll, compute payslips, and track disbursement.

**Models to create:**

```js
// StaffPayrollConfig.js  (tenant-scoped, per staff member)
{
  staffId:       UUID FK,
  basicSalary:   DECIMAL,
  components:    JSONB,   // [{componentId, overrideValue}]
  taxRegime:     ENUM("old", "new"),
  effectiveFrom: DATEONLY,
}

// PayrollRun.js  (tenant-scoped)
{
  month:           STRING,        // "2025-07"
  status:          ENUM("draft", "under_review", "approved", "disbursed"),
  totalGrossRaw:   BIGINT,
  totalNetRaw:     BIGINT,
  preparedById:    UUID FK,
  approvedById:    UUID FK nullable,
  approvedAt:      DATE nullable,
}

// Payslip.js  (tenant-scoped)
{
  payrollRunId:   UUID FK,
  staffId:        UUID FK,
  month:          STRING,
  workingDays:    INTEGER,
  presentDays:    DECIMAL,
  lopDays:        DECIMAL,
  components:     JSONB,          // [{name, type, amountRaw}]
  grossEarningsRaw:   BIGINT,
  totalDeductionsRaw: BIGINT,
  netPayRaw:          BIGINT,
  tdsRaw:             BIGINT,
  pfEmployeeRaw:      BIGINT,
  pfEmployerRaw:      BIGINT,
  payslipPdfUrl:      STRING nullable,
}
// unique: (tenantId, staffId, month)
```

**Routes:**

```
POST   /admin/payroll/runs               (initiate monthly run)
GET    /admin/payroll/runs
GET    /admin/payroll/runs/:id
PATCH  /admin/payroll/runs/:id/submit    (submit for review)
PATCH  /admin/payroll/runs/:id/approve   (principal approves)

GET    /admin/payroll/runs/:id/payslips
GET    /admin/payroll/payslips/:staffId  (one staff member's history)
```

---

### STAFF PORTAL

The entire staff portal is pending. Staff users log in and access `/staff/*`.

---

#### FEATURE S-1 · Staff Dashboard

**What:** A home screen showing today's timetable, pending leave applications, and class attendance summary.

**Routes:**

```
GET /staff/dashboard          (summary: today's periods, pending leaves, attendance %)
GET /staff/timetable          (slots assigned to this teacher for current AY)
```

---

#### FEATURE S-2 · Attendance Management (Staff)

**What:** Class teachers mark daily attendance for their section. Subject teachers mark period-wise attendance.

**Models to create:**

```js
// Attendance.js  (tenant-scoped)
{
  studentId:      UUID FK,
  sectionId:      UUID FK,
  academicYearId: UUID FK,
  date:           DATEONLY,
  status:         ENUM("present", "absent", "late", "half_day", "on_leave"),
  markedById:     UUID FK,
  isCorrected:    BOOLEAN,
  correctedById:  UUID FK nullable,
  correctionReason: TEXT nullable,
  notificationSent: BOOLEAN,
}
// unique: (tenantId, studentId, date)
```

**Routes:**

```
POST   /staff/attendance/bulk           (mark attendance for a section + date)
GET    /staff/attendance/:sectionId     (filter by date)
PATCH  /staff/attendance/:id            (correction with reason)
GET    /staff/attendance/summary/:studentId   (monthly % for a student)
```

**Business rules:**
- Only the class teacher of a section can mark/correct daily attendance
- Corrections require a non-empty `correctionReason`
- After submission, trigger a notification job for absent students (fire and forget)

---

#### FEATURE S-3 · Marks Entry (Staff)

**What:** Teachers enter exam marks for students in their assigned subjects.

**Routes:**

```
GET    /staff/exam-schedules            (schedules assigned to this teacher)
POST   /staff/marks/bulk               (upsert marks for one schedule)
GET    /staff/marks/:examScheduleId    (view entered marks)
```

**Business rules:**
- Teacher can only enter marks for subjects where a `TeacherSubjectAssignment` exists for them
- Blocked if `isMarksEntryLocked = true`
- All marks must be between 0 and `maxMarks × 100`

---

#### FEATURE S-4 · Leave Management (Staff)

**What:** Staff apply for leave. Supervisor approves or rejects.

**Models to create:**

```js
// LeaveType.js  (tenant-scoped)
{
  name:           STRING,   // "Casual Leave"
  code:           STRING,   // "CL"
  annualQuota:    DECIMAL,
  carryForward:   BOOLEAN,
  isPaidLeave:    BOOLEAN,
}

// LeaveApplication.js  (tenant-scoped)
{
  staffId:       UUID FK,
  leaveTypeId:   UUID FK,
  fromDate:      DATEONLY,
  toDate:        DATEONLY,
  numberOfDays:  DECIMAL,
  reason:        TEXT,
  status:        ENUM("pending", "approved", "rejected", "canceled"),
  approvedById:  UUID FK nullable,
  approvedAt:    DATE nullable,
  rejectionReason: TEXT nullable,
}
```

**Routes:**

```
POST   /staff/leaves                      (apply for leave)
GET    /staff/leaves                      (my applications)
PATCH  /staff/leaves/:id/cancel

GET    /admin/leaves                      (all pending applications)
PATCH  /admin/leaves/:id/approve
PATCH  /admin/leaves/:id/reject
```

---

#### FEATURE S-5 · Timetable View (Staff)

**What:** Staff view their weekly timetable.

**Routes:**

```
GET /staff/timetable                      (published slots for this teacher)
GET /staff/timetable/section/:sectionId   (full section timetable)
```

---

### PORTAL SIDE (Student & Parent)

The entire portal is pending. Students and parents log in at `/portal/*`.

---

#### FEATURE PO-1 · Student Dashboard

**What:** Home screen showing attendance %, upcoming exams, fee dues, and recent notices.

**Routes:**

```
GET /portal/dashboard
```

---

#### FEATURE PO-2 · Student Attendance

**What:** Student and parent view attendance records.

**Routes:**

```
GET /portal/attendance                     (own attendance, current AY)
GET /portal/attendance/monthly-summary     (month-wise % breakdown)
```

---

#### FEATURE PO-3 · Exam Results & Report Cards

**What:** Students view marks and download report cards after publication.

**Models to create:**

```js
// ReportCard.js  (tenant-scoped)
{
  studentId:    UUID FK,
  examGroupId:  UUID FK,
  pdfUrl:       STRING,
  generatedAt:  DATE,
  isPublished:  BOOLEAN,
}
```

**Routes:**

```
GET /portal/results                        (all published results for this student)
GET /portal/results/:examGroupId          (one exam group's marks)
GET /portal/report-cards/:examGroupId     (download PDF)
```

**Business rules:**
- Results only visible after `ExamGroup.isResultPublished = true`
- PDF served via time-limited pre-signed URL

---

#### FEATURE PO-4 · Fee & Payments

**What:** Students/parents view invoices and fee dues.

**Models to create:**

```js
// Invoice.js  (tenant-scoped)
{
  studentId:      UUID FK,
  academicYearId: UUID FK,
  invoiceNumber:  STRING,   // unique per tenant
  invoiceDate:    DATEONLY,
  dueDate:        DATEONLY,
  status:         ENUM("draft","sent","partially_paid","paid","overdue","canceled"),
  totalRaw:       BIGINT,
  paidRaw:        BIGINT,
  balanceRaw:     BIGINT,
}

// Payment.js  (tenant-scoped)
{
  invoiceId:     UUID FK,
  studentId:     UUID FK,
  receiptNumber: STRING,
  paymentDate:   DATEONLY,
  amountRaw:     BIGINT,
  paymentMode:   ENUM("cash","online","upi","cheque","neft"),
  status:        ENUM("pending","completed","failed","refunded"),
  gatewayPaymentId: STRING nullable,
}
```

**Routes:**

```
GET /portal/invoices                       (all invoices for this student)
GET /portal/invoices/:id                   (invoice detail + line items)
GET /portal/payments                       (payment history)
POST /portal/payments/initiate             (create gateway order)
POST /portal/payments/webhook              (gateway callback — public, verify signature)
```

---

#### FEATURE PO-5 · Notices

**What:** Students and parents view published announcements.

**Model to create:**

```js
// Notice.js  (tenant-scoped)
{
  title:          STRING,
  body:           TEXT,
  noticeType:     ENUM("general","exam","holiday","event","emergency","fee_reminder"),
  priority:       ENUM("low","medium","high","urgent"),
  targetAudience: JSONB,    // { type: "all"|"class"|"section", ids: [] }
  channels:       JSONB,    // ["portal","sms","email","push"]
  publishedAt:    DATE nullable,
  expiresAt:      DATE nullable,
  status:         ENUM("draft","scheduled","published","expired"),
  createdById:    UUID FK,
}
```

**Routes:**

```
GET /portal/notices                        (published, not expired, targeted to me)
GET /portal/notices/:id
```

---

## How to Contribute

```bash
# 1. Fork the repo and clone
git clone https://github.com/your-org/edu-server.git

# 2. Install dependencies
npm install

# 3. Copy env file
cp .env.example .env
# Fill in DATABASE_URL and other required values

# 4. Create your feature branch
git checkout -b feature/P-1-exam-management

# 5. Implement your feature
# model → repository → service → controller → router → validator

# 6. Open a pull request
# Title format: [P-1] Exam Management — Platform Config
```

**PR checklist:**
- [ ] Model created with `withTenant()`, proper indexes, and paranoid where relevant
- [ ] Repository extends `BaseRepository`
- [ ] Service extends `BaseService`, business rules enforced here (not in controller)
- [ ] Controller extends `BaseController`, uses `catchAsync`
- [ ] Router mounted in `app.js`
- [ ] Validator using `express-validator`
- [ ] No raw SQL — all queries through Sequelize

---

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@host:5432/edudb
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3001
```

---

## License

MIT
