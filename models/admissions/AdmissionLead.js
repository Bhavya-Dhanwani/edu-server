import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";
import { withTenant } from "../withTenant.js";

export const AdmissionLead = sequelize.define(
  "AdmissionLead",
  withTenant({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // =========================================
    // ADMISSION INFORMATION
    // =========================================


    academicYearId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "academic_years",
        key: "id",
      },
    },

    appliedClassId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "classes",
        key: "id",
      },
    },

    // =========================================
    // STUDENT INFORMATION
    // =========================================

    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    middleName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    gender: {
      type: DataTypes.ENUM(
        "male",
        "female",
        "other",
        "prefer_not_to_say"
      ),
      allowNull: false,
    },

    bloodGroup: {
      type: DataTypes.ENUM(
        "A+",
        "A-",
        "B+",
        "B-",
        "AB+",
        "AB-",
        "O+",
        "O-",
        "unknown"
      ),
      defaultValue: "unknown",
    },

    nationality: {
      type: DataTypes.STRING(100),
      defaultValue: "Indian",
    },

    religion: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    caste: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    category: {
      type: DataTypes.ENUM(
        "general",
        "obc",
        "sc",
        "st",
        "ews",
        "other"
      ),
      allowNull: true,
    },

    aadharNumber: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    photoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // =========================================
    // PREVIOUS EDUCATION
    // =========================================

    previousSchool: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    previousClass: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    tcNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    // =========================================
    // GUARDIAN INFORMATION
    // =========================================

    guardianName: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },

    guardianPhone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },

    guardianEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },

    // =========================================
    // EMERGENCY CONTACT
    // =========================================

    emergencyContactName: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    emergencyContactPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    // =========================================
    // ADDRESS
    // =========================================

    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    pincode: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    // =========================================
    // OTHER INFORMATION
    // =========================================

    isStaffWard: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    transportRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    hostelRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    medicalConditions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // =========================================
    // ADMISSION WORKFLOW
    // =========================================

    status: {
      type: DataTypes.ENUM(
        "new",
        "contacted",
        "under_review",
        "approved",
        "rejected",
        "converted",
        "cancelled"
      ),
      defaultValue: "new",
      allowNull: false,
    },

    assignedToId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },

    convertedStudentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "students",
        key: "id",
      },
    },

    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // =========================================
    // DOCUMENTS
    // =========================================

    documents: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },

    // =========================================
    // STATUS HISTORY
    // =========================================

    statusHistory: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
  }),
  {
    timestamps: true,
    paranoid: true,
    underscored: true,
    tableName: "admission_leads",
  }
);