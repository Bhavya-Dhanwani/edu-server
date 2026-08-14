import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { withTenant } from "./withTenant.js";

export const Student = sequelize.define(
  "Student",
   withTenant(
     {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      unique: true,
      references: { model: "users", key: "id" },
    },
    admissionNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    rollNumber: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
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
      type: DataTypes.ENUM("male", "female", "other", "prefer_not_to_say"),
      allowNull: false,
    },
    bloodGroup: {
      type: DataTypes.ENUM("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"),
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
      type: DataTypes.ENUM("general", "obc", "sc", "st", "ews", "other"),
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
    enrollmentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
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
    siblingId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "students", key: "id" },
    },
    isStaffWard: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM(
        "active",
        "inactive",
        "transferred_out",
        "passed_out",
        "dropped"
      ),
      defaultValue: "active",
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
    emergencyContactName: {
      type: DataTypes.STRING(150),
      allowNull: true,  
    },
    emergencyContactPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
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
  },
   ) , 
  {
    timestamps: true,
    paranoid: true,
    underscored: true,
    tableName: "students",
    // indexes: [
    //   { unique: true, fields: ["tenant_id", "admission_number"] },
    //   { unique: true, fields: ["tenant_id", "user_id"] },
    // ],
  }
);