  import { DataTypes } from "sequelize";
  import sequelize from "../../config/db.js";
  import { withTenant } from "../withTenant.js";

  export const SubjectMaster = sequelize.define(
    "SubjectMaster",
    withTenant({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(150), allowNull: false }, 
      type: { 
          type: DataTypes.ENUM("theory", "practical", "both"), 
          defaultValue: "theory" 
      }
    }),
    { timestamps: true, underscored: true, tableName: "subject_masters" }
  );

  export const ClassSubject = sequelize.define(
    "ClassSubject",
    withTenant({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      subjectMasterId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "subject_masters", key: "id" }
      },
      classId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "classes", key: "id" }
      },
      code: { type: DataTypes.STRING(30), allowNull: true }, 
      isElective: { type: DataTypes.BOOLEAN, defaultValue: false },
      weeklyPeriods: { type: DataTypes.INTEGER, defaultValue: 5 },
      passingMarks: { type: DataTypes.INTEGER, defaultValue: 33 },
    }),
    { timestamps: true, underscored: true, tableName: "class_subjects" }
  );