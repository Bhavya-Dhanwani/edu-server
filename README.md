# edu-server

A multi-tenant education SaaS backend built with **Node.js, Express 5, Sequelize 6, and PostgreSQL**.

This repository is an open-sourced, production-ready backend foundation for an Education ERP / SaaS platform. The core multi-tenancy architecture, RBAC, academic structures, attendance tracking, exam grading, fee structures, and profile management are fully implemented.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ES Modules) |
| Framework | Express 5 |
| ORM | Sequelize 6 |
| Database | PostgreSQL |
| Auth & Security | JWT, `helmet`, `cors`, `cookie-parser`, `morgan` |
| Testing | Vitest |

---

## Project Structure

```
edu-server/
├── app.js                        # Express application setup & route mounting
├── index.js                      # Entry point — DB connection, model sync, server start
├── config/
│   └── db.js                     # Sequelize instance (PostgreSQL + SSL + connection pool)
├── models/
│   ├── index.js                  # Model imports & entity relationship associations
│   ├── withTenant.js             # Shared tenant field injector (tenantId, customFields, metadata)
│   ├── Tenant.js
│   ├── TenantProvisioningStep.js
│   ├── Plan.js
│   ├── Subscription.js
│   ├── Users.js
│   ├── Role.js                   # type: platform | admin | staff | portal
│   ├── Permission.js
│   ├── RolePermission.js
│   ├── UserRole.js
│   ├── Students.js
│   ├── Staff.js
│   ├── Guardian.js
│   ├── StudentGaurdianMap.js
│   ├── StudentSectionEnrollment.js
│   ├── TeacherSubjectAssignment.js
│   ├── Attendance.js
│   ├── AttendancePeriod.js
│   ├── Infrastructure.js         # Room, Timetable, TimetableSlot
│   ├── Academic/
│   │   ├── AcademicYear.js
│   │   ├── Class.js
│   │   ├── Section.js
│   │   └── Subject.js            # SubjectMaster & ClassSubject
│   ├── FeeStructure/
│   │   ├── FeeHead.js
│   │   ├── FeeStructure.js
│   │   └── FeeStructureItem.js
│   ├── exams/
│   │   └── Exams.js              # ExamGroup, ExamSchedule, Mark, GradeScale, GradeScaleRule
│   ├── platform/
│   │   └── Infrastructure.js     # WebhookEndpoint, BiometricPunch
│   ├── communication/
│   │   └── Notice.js
│   ├── finance/
│   │   └── Invoices.js
│   ├── hr/
│   │   └── Payroll.js
│   └── transport/
│       └── Transport.js
├── controllers/                  # Layered controllers extending BaseController
├── services/                     # Business logic services extending BaseService
├── repositories/                 # Data access repositories extending BaseRepository
├── router/                       # Modular API routers
├── middlewares/
│   ├── error/
│   │   └── error.middleware.js   # globalErrorHandler (AppError handling)
│   ├── security/
│   │   └── index.js              # identifyUser (JWT/Tenant resolution) & checkPermission
│   └── validators/               # Custom validation middlewares
└── utils/
    ├── AppError.js               # Custom operational error class
    ├── catchAsync.js             # Async error handler wrapper
    ├── jwt.js                    # JWT signing & verification helper
    ├── bcrypt.js                 # Password hashing helper
    └── cookie.js                 # Auth cookie options helper
```

---

## Multi-Tenancy Design

Every tenant-scoped model uses `withTenant()` from `models/withTenant.js`:

```js
// models/withTenant.js
export const withTenant = (schema, options = { isGlobal: false }) => ({
  ...schema,
  tenantId: {
    type: DataTypes.UUID,
    allowNull: options.isGlobal,
    references: { model: "tenants", key: "id" },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  },
  customFields: { type: DataTypes.JSONB, defaultValue: {} },
  metadata:     { type: DataTypes.JSONB, defaultValue: {} },
});
```

**Deliberate Exceptions:**

- `User.tenantId` → nullable (`super_admin` operates across tenants)
- `Role.tenantId` → nullable (platform-level system roles)

Tenant resolution is enforced at the network boundary by `identifyUser` in `middlewares/security/index.js`, which attaches `req.tenantId` and `req.user` to incoming requests.

---

## Role System & Portal Routing

Roles have a `type` field defining target access portals:

| `type` | Portal | Access Scope |
|---|---|---|
| `platform` | `/platform/*` | Super admins (SaaS platform team) |
| `admin` | `/admin/*` | School owners, principals, administrators |
| `staff` | `/staff/*` | Teachers, accountants, HR personnel |
| `portal` | `/portal/*` | Students and parents |

Permissions use fine-grained `action:resource` formats (e.g. `read:students`, `create:exams`). Super admins hold wildcard (`*`) access.

---

## Codebase Status & What Is Built

### 1. Core Architecture & Wiring (Complete)
- [x] All routes cleanly mounted under `/api/v1/*` in `app.js`
- [x] Global error handling wired via `globalErrorHandler` middleware
- [x] `identifyUser` and `checkPermission` security & tenant-resolution middlewares
- [x] `Subscription.js` standardized with `tenantId`
- [x] `BaseRepository`, `BaseService`, and `BaseController` generic abstractions
- [x] ES module imports properly referenced with `.js` extensions
- [x] Unit testing setup with Vitest passing cleanly (`npm test`)

### 2. Implemented Modules & Routes
- [x] **Tenants & Billing**: Tenant registration, updates, status changes, branding assets (`/api/v1/tenants`)
- [x] **Auth & RBAC**: User management, roles, permissions, role assignments (`/api/v1/users`, `/api/v1/roles`, `/api/v1/permissions`, `/api/v1/user-roles`)
- [x] **Academic Structure**: Academic years, classes, sections, subject masters (`/api/v1/academic-years`, `/api/v1/classes`, `/api/v1/sections`, `/api/v1/subjects`)
- [x] **People Profiles**: Students, staff, guardians, section enrollments (`/api/v1/students`, `/api/v1/staff`, `/api/v1/guardians`, `/api/v1/enrollments`)
- [x] **Attendance & Biometrics**: Daily section attendance, period-wise attendance, staff biometric punch ingestion (`/api/v1/attendance`, `/api/v1/attendance-periods`, `/api/v1/biometric-punches`)
- [x] **Exams & Grading**: Exam groups, exam schedules, raw mark entry, grade scale templates & rules (`/api/v1/exam-groups`, `/api/v1/exam-schedules`, `/api/v1/marks`, `/api/v1/grade-scales`, `/api/v1/grade-scale-rules`)
- [x] **Fee Management**: Fee heads, fee structures, fee structure line items (`/api/v1/fee-heads`, `/api/v1/fee-structures`, `/api/v1/fee-structure-items`)
- [x] **Integrations**: Webhook endpoints management (`/api/v1/webhook-endpoints`)

---

## Pending Features — Open for Contribution

Choose a feature, implement it end-to-end (Model → Repository → Service → Controller → Router → Validator), add tests, and submit a PR!

---

### PLATFORM SIDE (`/platform/*`)

#### FEATURE P-1 · Global Payroll Component Templates & Tax Slabs

**What:** Super admins define platform-wide earning/deduction components (Basic, HRA, PF, TDS) and annual tax slabs.

**Models to create:**

```js
// PayrollComponent.js (tenantId nullable for platform defaults)
{
  name:          STRING,      // "Basic", "HRA", "PF Employee"
  componentType: ENUM("earning", "deduction"),
  calculationType: ENUM("flat", "percentage_of_basic", "percentage_of_gross"),
  defaultValue:  DECIMAL,
  isSystem:      BOOLEAN,
}

// TaxSlab.js
{
  financialYear: STRING,      // "2025-26"
  regime:        ENUM("old", "new"),
  slabs:         JSONB,       // [{ from: 0, to: 300000, rate: 0 }, ...]
  state:         STRING,      // for Professional Tax
}
```

**Routes:**
```
POST   /api/v1/platform/payroll-components
GET    /api/v1/platform/payroll-components
PATCH  /api/v1/platform/payroll-components/:id

POST   /api/v1/platform/tax-slabs
GET    /api/v1/platform/tax-slabs
PATCH  /api/v1/platform/tax-slabs/:id
```

---

### ADMIN SIDE (`/admin/*`)

#### FEATURE A-1 · Monthly Payroll Processing & Payslips

**What:** HR admins configure staff salary structures, execute monthly payroll runs, compute LOP/deductions, and generate payslips.

**Models to create:**

```js
// StaffPayrollConfig.js (tenant-scoped)
{
  staffId:       UUID FK,
  basicSalary:   DECIMAL,
  components:    JSONB,     // [{ componentId, overrideValue }]
  taxRegime:     ENUM("old", "new"),
  effectiveFrom: DATEONLY,
}

// PayrollRun.js (tenant-scoped)
{
  month:         STRING,    // "2025-07"
  status:        ENUM("draft", "under_review", "approved", "disbursed"),
  totalGrossRaw: BIGINT,
  totalNetRaw:   BIGINT,
  preparedById:  UUID FK,
  approvedById:  UUID FK nullable,
  approvedAt:    DATE nullable,
}

// Payslip.js (tenant-scoped)
{
  payrollRunId:       UUID FK,
  staffId:            UUID FK,
  month:              STRING,
  workingDays:        INTEGER,
  presentDays:        DECIMAL,
  lopDays:            DECIMAL,
  components:         JSONB,
  grossEarningsRaw:   BIGINT,
  totalDeductionsRaw: BIGINT,
  netPayRaw:          BIGINT,
  payslipPdfUrl:      STRING nullable,
}
```

**Routes:**
```
POST   /api/v1/admin/payroll/runs
GET    /api/v1/admin/payroll/runs
GET    /api/v1/admin/payroll/runs/:id
PATCH  /api/v1/admin/payroll/runs/:id/submit
PATCH  /api/v1/admin/payroll/runs/:id/approve
GET    /api/v1/admin/payroll/runs/:id/payslips
GET    /api/v1/admin/payroll/payslips/:staffId
```

---

### STAFF PORTAL (`/staff/*`)

#### FEATURE S-1 · Staff Dashboard & Leave Management

**What:** Staff view a consolidated dashboard (today's periods, pending leaves, attendance summary) and manage leave applications.

**Models to create:**

```js
// LeaveType.js (tenant-scoped)
{
  name:         STRING,     // "Casual Leave"
  code:         STRING,     // "CL"
  annualQuota:  DECIMAL,
  carryForward: BOOLEAN,
  isPaidLeave:  BOOLEAN,
}

// LeaveApplication.js (tenant-scoped)
{
  staffId:         UUID FK,
  leaveTypeId:     UUID FK,
  fromDate:        DATEONLY,
  toDate:          DATEONLY,
  numberOfDays:    DECIMAL,
  reason:          TEXT,
  status:          ENUM("pending", "approved", "rejected", "canceled"),
  approvedById:    UUID FK nullable,
  approvedAt:      DATE nullable,
  rejectionReason: TEXT nullable,
}
```

**Routes:**
```
GET    /api/v1/staff/dashboard
POST   /api/v1/staff/leaves
GET    /api/v1/staff/leaves
PATCH  /api/v1/staff/leaves/:id/cancel
GET    /api/v1/admin/leaves
PATCH  /api/v1/admin/leaves/:id/approve
PATCH  /api/v1/admin/leaves/:id/reject
```

---

### PORTAL SIDE (`/portal/*` - Student & Parent)

#### FEATURE PO-1 · Student Dashboard & Exam Results

**What:** Students and parents log in to view their dashboard (attendance %, upcoming exams, fee dues) and published exam results / report cards.

**Models to create:**

```js
// ReportCard.js (tenant-scoped)
{
  studentId:   UUID FK,
  examGroupId: UUID FK,
  pdfUrl:      STRING,
  generatedAt: DATE,
  isPublished: BOOLEAN,
}
```

**Routes:**
```
GET /api/v1/portal/dashboard
GET /api/v1/portal/results
GET /api/v1/portal/results/:examGroupId
GET /api/v1/portal/report-cards/:examGroupId
```

---

#### FEATURE PO-2 · Student Fee Payments & Gateway Integration

**What:** Invoicing and online fee collection via payment gateway.

**Models to create:**

```js
// Invoice.js (tenant-scoped)
{
  studentId:      UUID FK,
  academicYearId: UUID FK,
  invoiceNumber:  STRING,
  invoiceDate:    DATEONLY,
  dueDate:        DATEONLY,
  status:         ENUM("draft", "sent", "partially_paid", "paid", "overdue", "canceled"),
  totalRaw:       BIGINT,
  paidRaw:        BIGINT,
  balanceRaw:     BIGINT,
}

// Payment.js (tenant-scoped)
{
  invoiceId:        UUID FK,
  studentId:        UUID FK,
  receiptNumber:    STRING,
  paymentDate:      DATEONLY,
  amountRaw:        BIGINT,
  paymentMode:      ENUM("cash", "online", "upi", "cheque", "neft"),
  status:           ENUM("pending", "completed", "failed", "refunded"),
  gatewayPaymentId: STRING nullable,
}
```

**Routes:**
```
GET  /api/v1/portal/invoices
GET  /api/v1/portal/invoices/:id
GET  /api/v1/portal/payments
POST /api/v1/portal/payments/initiate
POST /api/v1/portal/payments/webhook    (public webhook endpoint with signature verification)
```

---

#### FEATURE PO-3 · Student Notice Board

**What:** View published announcements targeted to the student's class or section.

**Routes:**
```
GET /api/v1/portal/notices
GET /api/v1/portal/notices/:id
```

---

## How to Contribute

```bash
# 1. Clone the repository
git clone https://github.com/your-org/edu-server.git
cd edu-server

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env

# 4. Create your feature branch
git checkout -b feature/P-1-payroll-components

# 5. Run tests
npm test

# 6. Implement feature and open a Pull Request
```

**PR Checklist:**
- [ ] Model defined with `withTenant()` and indexed fields
- [ ] Repository extends `BaseRepository`
- [ ] Service extends `BaseService` (business logic lives here)
- [ ] Controller extends `BaseController` and wraps handlers with `catchAsync`
- [ ] Router mounted cleanly in `app.js` with `.js` import extensions
- [ ] Input validation middleware included
- [ ] Unit tests added under `tests/unit/`

---

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/edudb
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3001
JWT_SECRET=your_jwt_secret_key
SUPER_ADMIN_ROLE_ID=your_super_admin_role_uuid
```

---

## License

MIT
