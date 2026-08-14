import { AppError } from "../../../utils/AppError.js";
import {
  createValidator,
  ensureUUID,
  ensureDate,
} from "./examValidatorHelpers.js";

const ensurePositiveInteger = (value, fieldName) => {
  const num = parseInt(value);
  if (isNaN(num) || num <= 0) {
    throw new AppError(`${fieldName} must be a positive integer`, 400);
  }
};

const ensureTime = (value, fieldName) => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
  if (!timeRegex.test(value)) {
    throw new AppError(`${fieldName} must be a valid time (HH:MM or HH:MM:SS)`, 400);
  }
};

export const createExamScheduleValidator = createValidator((req) => {
  const { body } = req;

  ensureUUID(body.examGroupId, "examGroupId");
  ensureUUID(body.subjectId, "subjectId");

  const sectionIds = Array.isArray(body.sectionIds)
    ? body.sectionIds
    : Array.isArray(body.sectionId)
    ? body.sectionId
    : body.sectionId
    ? [body.sectionId]
    : [];

  if (sectionIds.length === 0) {
    throw new AppError("At least one section must be provided", 400);
  }

  for (const sId of sectionIds) {
    ensureUUID(sId, "sectionId");
  }

  ensureDate(body.examDate, "examDate");
  ensurePositiveInteger(body.maxMarks, "maxMarks");
  ensurePositiveInteger(body.passingMarks, "passingMarks");

  if (body.startTime !== undefined) ensureTime(body.startTime, "startTime");
  if (body.endTime !== undefined) ensureTime(body.endTime, "endTime");

  if (body.passingMarks !== undefined && body.maxMarks !== undefined) {
    if (parseInt(body.passingMarks) >= parseInt(body.maxMarks)) {
      throw new AppError("passingMarks must be less than maxMarks", 400);
    }
  }
});

export const updateExamScheduleValidator = createValidator((req) => {
  const { body } = req;

  if (body.examGroupId !== undefined) ensureUUID(body.examGroupId, "examGroupId");
  if (body.subjectId !== undefined) ensureUUID(body.subjectId, "subjectId");
  if (body.sectionId !== undefined) ensureUUID(body.sectionId, "sectionId");
  if (body.examDate !== undefined) ensureDate(body.examDate, "examDate");
  if (body.maxMarks !== undefined) ensurePositiveInteger(body.maxMarks, "maxMarks");
  if (body.passingMarks !== undefined) ensurePositiveInteger(body.passingMarks, "passingMarks");
  if (body.startTime !== undefined) ensureTime(body.startTime, "startTime");
  if (body.endTime !== undefined) ensureTime(body.endTime, "endTime");
});