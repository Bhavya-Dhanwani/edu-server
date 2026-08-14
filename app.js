import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import permissionRouter from "./router/permission.router.js";
import roleRouter from "./router/role.router.js";
import tenantRouter from "./router/tenant.router.js";
import userRouter from "./router/user.router.js";
import userRoleRouter from "./router/user-role.router.js";
import staffRouter from "./router/staff.router.js";
import academicYearRouter from "./router/Academic/academicYear.routes.js";
import classRouter from "./router/Academic/class.routes.js";
import sectionRouter from "./router/Academic/section.routes.js";
import subjectRouter from "./router/Academic/subject.router.js";
import studentRouter from "./router/student.routes.js";
import admissionLeadRouter from "./router/admissions/admissionLead.router.js";
import enrollmentRouter from "./router/studentSectionEnrollment.routes.js";
import attendanceRouter from './router/attendance.routes.js';
import attendancePeriodRouter from './router/attendancePeriod.routes.js';
import feeHeadRouter from "./router/FeeStructure/feeHead.router.js";
import feeStructureRouter from "./router/FeeStructure/feeStructure.router.js";
import feeStructureItemRouter from "./router/FeeStructure/feeStructureItem.router.js";
import { globalErrorHandler } from "./middlewares/error/error.middleware.js";
import cookieParser from "cookie-parser";

import guardianRouter from "./router/guardian.router.js";
import webhookEndpointRouter from "./router/webhook-endpoint.router.js";
import biometricPunchRouter from "./router/biometric-punch.router.js";
import examGroupRoutes from "./router/Exam/examGroup.routes.js";
import examScheduleRoutes from "./router/Exam/examSchedule.routes.js";
import markRoutes from "./router/Exam/mark.routes.js";
import gradeScaleRoutes from "./router/Exam/gradeScale.routes.js";
import gradeScaleRuleRoutes from "./router/Exam/gradeScaleRule.routes.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.join(__dirname, "storage");
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: allowedOrigins.length
    ? (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
      }
    : true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-tenant-id"],
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(uploadsRoot));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});

app.use("/api/v1/tenants", tenantRouter);
app.use("/api/v1/roles", roleRouter);
app.use("/api/v1/permissions", permissionRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/user-roles", userRoleRouter);
app.use("/api/v1/staff", staffRouter);
app.use("/api/v1/academic-years", academicYearRouter);
app.use("/api/v1/classes", classRouter);
app.use("/api/v1/sections", sectionRouter);
app.use("/api/v1/subjects", subjectRouter);
app.use("/api/v1/students", studentRouter);
app.use("/api/v1/admissions", admissionLeadRouter);
app.use("/api/v1/enrollments", enrollmentRouter);
app.use("/api/v1/attendance", attendanceRouter);
app.use("/api/v1/attendance-periods", attendancePeriodRouter);
app.use("/api/v1/guardians", guardianRouter);
app.use("/api/v1/webhook-endpoints", webhookEndpointRouter);
app.use("/api/v1/biometric-punches", biometricPunchRouter);
app.use("/api/v1/fee-heads", feeHeadRouter);
app.use("/api/v1/fee-structures", feeStructureRouter);
app.use("/api/v1/fee-structure-items", feeStructureItemRouter);

app.use("/api/v1/exam-groups", examGroupRoutes);
app.use("/api/v1/exam-schedules", examScheduleRoutes);
app.use("/api/v1/marks", markRoutes);
app.use("/api/v1/grade-scales", gradeScaleRoutes);
app.use("/api/v1/grade-scale-rules", gradeScaleRuleRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});
app.use(globalErrorHandler);
export default app;





