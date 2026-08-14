import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";
import { withTenant } from "../withTenant.js";

export const ExamGroup = sequelize.define(
  "ExamGroup",
  withTenant({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    academicYearId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "academic_years", key: "id" },
    },
    name: { type: DataTypes.STRING(150), allowNull: false },
    examType: {
      type: DataTypes.ENUM(
        "unit_test",
        "mid_term",
        "half_yearly",
        "annual",
        "practical",
        "board",
        "internal",
        "other",
      ),
      allowNull: false,
    },
    gradingSchemeId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "grade_scales", key: "id" },
    },
    startDate: { type: DataTypes.DATEONLY, allowNull: true },
    endDate: { type: DataTypes.DATEONLY, allowNull: true },
    isResultPublished: { type: DataTypes.BOOLEAN, defaultValue: false },
    weightagePercent: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  }),
  {
    timestamps: true,
    underscored: true,
    tableName: "exam_groups",
    // indexes: [
    //   ...tenantIndex(["academic_year_id"]),
    //   ...tenantIndex(["exam_type"]),
    // ],
  },
);

export const ExamSchedule = sequelize.define(
  "ExamSchedule",
  withTenant({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    examGroupId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "exam_groups", key: "id" },
      onDelete: "CASCADE",
    },
    subjectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "class_subjects",
        key: "id",
      },
    },
    sectionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "sections", key: "id" },
      onDelete: "CASCADE",
    },

    assessmentType: {
      type: DataTypes.ENUM(
        "theory",
        "internal",
        "external",
        "practical",
        "viva",
        "other",
      ),
      allowNull: false,
      defaultValue: "theory",
    },
    examDate: { type: DataTypes.DATEONLY, allowNull: false },
    startTime: { type: DataTypes.TIME, allowNull: true },
    endTime: { type: DataTypes.TIME, allowNull: true },
    maxMarks: { type: DataTypes.INTEGER, allowNull: false },
    passingMarks: { type: DataTypes.INTEGER, allowNull: false },
  }),
  {
    timestamps: true,
    underscored: true,
    tableName: "exam_schedules",
    // indexes:[
    //   {
    //     unique:true , 
    //     fields:["tenant_id", "exam_group_id", "subject_id", "section_id", "assessment_type"]
    //   }
    // ]
  },
);

export const Mark = sequelize.define(
  "Mark",
  withTenant({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "students", key: "id" },
    },
    examScheduleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "exam_schedules", key: "id" },
    },
    marksObtainedRaw: { type: DataTypes.INTEGER, allowNull: true },
    isAbsent: { type: DataTypes.BOOLEAN, defaultValue: false },
    enteredById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
    },
  }),
  {
    timestamps: true,
    underscored: true,
    tableName: "marks",
    indexes: [
      { unique: true, fields: ["tenant_id", "student_id", "exam_schedule_id"] },
    ],
  },
);

export const GradeScale = sequelize.define(
  "GradeScale",
  withTenant({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(150), allowNull: false },
    scaleType: {
      type: DataTypes.ENUM("percentage", "gpa", "cgpa", "letter", "custom"),
      allowNull: false,
    },
    isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
  }),
  { timestamps: true, underscored: true, tableName: "grade_scales" },
);

export const GradeScaleRule = sequelize.define(
  "GradeScaleRule",
  withTenant({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    gradeScaleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "grade_scales", key: "id" },
      onDelete: "CASCADE",
    },
    gradeLabel: { type: DataTypes.STRING(20), allowNull: false },
    minPercentage: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    maxPercentage: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    gradePoint: { type: DataTypes.DECIMAL(4, 2), allowNull: true },
  }),
  { timestamps: false, underscored: true, tableName: "grade_scale_rules" },
);