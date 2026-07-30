import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { withTenant } from "./withTenant.js";

// ─── Room ─────────────────────────────────────────────────────────────────────
export const Room = sequelize.define(
  "Room",
  withTenant({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    roomType: {
      type: DataTypes.ENUM("classroom", "lab", "hall", "sports", "library"),
      defaultValue: "classroom",
    },
    capacity: {
      type: DataTypes.INTEGER,
      defaultValue: 40,
    },
  }),
  {
    timestamps: true,
    underscored: true,
    tableName: "rooms",
    // indexes: [{ unique: true, fields: ["tenant_id", "name"] }],
  },
);

// ─── Timetable ────────────────────────────────────────────────────────────────
export const Timetable = sequelize.define(
  "Timetable",
  withTenant({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sectionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "sections", key: "id" },
      onDelete: "CASCADE",
    },
    academicYearId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "academic_years", key: "id" },
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("draft", "published", "archived"),
      defaultValue: "draft",
    },
  }),
  {
    timestamps: true,
    underscored: true,
    tableName: "timetables",
    // indexes: [{ fields: ["tenant_id", "section_id", "status"] }],
  },
);

// ─── TimetableSlot ────────────────────────────────────────────────────────────
export const TimetableSlot = sequelize.define(
  "TimetableSlot",
  withTenant({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    timetableId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "timetables", key: "id" },
    },
    subjectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "class_subjects",
        key: "id",
      },
    },
    teacherId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    roomId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "rooms", key: "id" },
    },
    dayOfWeek: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    periodNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    startTime: { type: DataTypes.TIME, allowNull: false },
    endTime: { type: DataTypes.TIME, allowNull: false },
  }),
  {
    timestamps: false,
    underscored: true,
    tableName: "timetable_slots",
    // indexes: [
    //   // Collision detection: Teacher cannot be in two rooms at the same time
    //   { unique: true, fields: ["tenant_id", "teacher_id", "day_of_week", "period_number"] },
    //   // Collision detection: Room cannot host two subjects at the same time
    //   { unique: true, fields: ["tenant_id", "room_id", "day_of_week", "period_number"] },
    // ],
  },
);
