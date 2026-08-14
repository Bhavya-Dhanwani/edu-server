import { AppError } from "../../utils/AppError.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createValidator = (validateFn) => (req, res, next) => {
  try {
    validateFn(req);
    next();
  } catch (error) {
    next(error);
  }
};

const ensureUuid = (value, fieldName) => {
  if (typeof value !== "string" || !UUID_REGEX.test(value.trim())) {
    throw new AppError(`${fieldName} must be a valid UUID`, 400);
  }
};

const ensureOptionalUuid = (value, fieldName) => {
  if (value === undefined || value === null || value === "") return;
  ensureUuid(value, fieldName);
};

const ensureString = (value, fieldName, { min = 1, max = 255 } = {}) => {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) {
    throw new AppError(`${fieldName} must be ${min}-${max} characters`, 400);
  }
};

const ensureOptionalString = (value, fieldName, options = {}) => {
  if (value === undefined || value === null || value === "") return;
  ensureString(value, fieldName, options);
};

const ensureDate = (value, fieldName) => {
  if (value === undefined || value === null || value === "") return;
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new AppError(`${fieldName} must be a valid date`, 400);
  }
};

const ensureRequiredDate = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    throw new AppError(`${fieldName} is required`, 400);
  }
  ensureDate(value, fieldName);
};

const ensureBoolean = (value, fieldName) => {
  if (value === undefined || value === null) return;
  if (typeof value !== "boolean") {
    throw new AppError(`${fieldName} must be a boolean`, 400);
  }
};

const ensureEnum = (value, fieldName, allowedValues) => {
  if (value === undefined || value === null || value === "") return;
  if (!allowedValues.includes(value)) {
    throw new AppError(`${fieldName} must be one of: ${allowedValues.join(", ")}`, 400);
  }
};

const ensureRequiredEnum = (value, fieldName, allowedValues) => {
  if (value === undefined || value === null || value === "") {
    throw new AppError(`${fieldName} is required`, 400);
  }
  ensureEnum(value, fieldName, allowedValues);
};

const ensureOptionalEnum = (value, fieldName, allowedValues) => {
  if (value === undefined || value === null || value === "") return;
  ensureEnum(value, fieldName, allowedValues);
};

const ensureNoTenantId = (body) => {
  if (body.tenantId !== undefined || body.tenant_id !== undefined) {
    throw new AppError("tenantId may not be provided in request body", 400);
  }
};

const GENDERS = ["male", "female", "other", "prefer_not_to_say"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"];
const CATEGORIES = ["general", "obc", "sc", "st", "ews", "other"];
const STATUSES = [
  "new",
  "contacted",
  "under_review",
  "approved",
  "rejected",
  "converted",
  "cancelled",
];

export const createAdmissionLeadValidator = createValidator((req) => {
  ensureNoTenantId(req.body);

  ensureUuid(req.body.academicYearId, "academicYearId");
  ensureUuid(req.body.appliedClassId, "appliedClassId");
  ensureString(req.body.firstName, "firstName", { min: 1, max: 100 });
  ensureOptionalString(req.body.middleName, "middleName", { min: 1, max: 100 });
  ensureString(req.body.lastName, "lastName", { min: 1, max: 100 });
  ensureRequiredDate(req.body.dateOfBirth, "dateOfBirth");
  ensureRequiredEnum(req.body.gender, "gender", GENDERS);
  ensureString(req.body.guardianName, "guardianName", { min: 1, max: 200 });
  ensureString(req.body.guardianPhone, "guardianPhone", { min: 1, max: 20 });
  ensureOptionalString(req.body.guardianEmail, "guardianEmail", { min: 1, max: 255 });

  ensureOptionalEnum(req.body.bloodGroup, "bloodGroup", BLOOD_GROUPS);
  ensureOptionalString(req.body.nationality, "nationality", { min: 1, max: 100 });
  ensureOptionalString(req.body.religion, "religion", { min: 1, max: 100 });
  ensureOptionalString(req.body.caste, "caste", { min: 1, max: 100 });
  ensureOptionalEnum(req.body.category, "category", CATEGORIES);
  ensureOptionalString(req.body.aadharNumber, "aadharNumber", { min: 1, max: 255 });
  ensureOptionalString(req.body.photoUrl, "photoUrl", { min: 1, max: 2048 });
  ensureOptionalString(req.body.previousSchool, "previousSchool", { min: 1, max: 255 });
  ensureOptionalString(req.body.previousClass, "previousClass", { min: 1, max: 100 });
  ensureOptionalString(req.body.tcNumber, "tcNumber", { min: 1, max: 100 });
  ensureOptionalString(req.body.emergencyContactName, "emergencyContactName", { min: 1, max: 150 });
  ensureOptionalString(req.body.emergencyContactPhone, "emergencyContactPhone", { min: 1, max: 20 });
  ensureOptionalString(req.body.address, "address", { min: 1, max: 1000 });
  ensureOptionalString(req.body.city, "city", { min: 1, max: 100 });
  ensureOptionalString(req.body.pincode, "pincode", { min: 1, max: 20 });
  ensureBoolean(req.body.isStaffWard, "isStaffWard");
  ensureBoolean(req.body.transportRequired, "transportRequired");
  ensureBoolean(req.body.hostelRequired, "hostelRequired");
  ensureOptionalString(req.body.medicalConditions, "medicalConditions", { min: 1, max: 1000 });
  ensureOptionalEnum(req.body.status, "status", STATUSES);
  ensureOptionalUuid(req.body.assignedToId, "assignedToId");
});

export const updateAdmissionLeadValidator = createValidator((req) => {
  ensureNoTenantId(req.body);

  if (req.body.academicYearId !== undefined) {
    ensureUuid(req.body.academicYearId, "academicYearId");
  }
  if (req.body.appliedClassId !== undefined) {
    ensureUuid(req.body.appliedClassId, "appliedClassId");
  }
  if (req.body.firstName !== undefined) {
    ensureString(req.body.firstName, "firstName", { min: 1, max: 100 });
  }
  if (req.body.middleName !== undefined) {
    ensureOptionalString(req.body.middleName, "middleName", { min: 1, max: 100 });
  }
  if (req.body.lastName !== undefined) {
    ensureString(req.body.lastName, "lastName", { min: 1, max: 100 });
  }
  if (req.body.dateOfBirth !== undefined) {
    ensureDate(req.body.dateOfBirth, "dateOfBirth");
  }
  if (req.body.gender !== undefined) {
    ensureEnum(req.body.gender, "gender", GENDERS);
  }
  if (req.body.guardianName !== undefined) {
    ensureString(req.body.guardianName, "guardianName", { min: 1, max: 200 });
  }
  if (req.body.guardianPhone !== undefined) {
    ensureString(req.body.guardianPhone, "guardianPhone", { min: 1, max: 20 });
  }
  if (req.body.guardianEmail !== undefined) {
    ensureOptionalString(req.body.guardianEmail, "guardianEmail", { min: 1, max: 255 });
  }
  if (req.body.bloodGroup !== undefined) {
    ensureEnum(req.body.bloodGroup, "bloodGroup", BLOOD_GROUPS);
  }
  if (req.body.category !== undefined) {
    ensureEnum(req.body.category, "category", CATEGORIES);
  }
  if (req.body.isStaffWard !== undefined) {
    ensureBoolean(req.body.isStaffWard, "isStaffWard");
  }
  if (req.body.transportRequired !== undefined) {
    ensureBoolean(req.body.transportRequired, "transportRequired");
  }
  if (req.body.hostelRequired !== undefined) {
    ensureBoolean(req.body.hostelRequired, "hostelRequired");
  }
  if (req.body.assignedToId !== undefined) {
    ensureOptionalUuid(req.body.assignedToId, "assignedToId");
  }
});

export const updateAdmissionLeadStatusValidator = createValidator((req) => {
  ensureNoTenantId(req.body);
  ensureRequiredEnum(req.body.status, "status", STATUSES);
  ensureOptionalString(req.body.rejectionReason, "rejectionReason", { min: 1, max: 1000 });
  ensureOptionalString(req.body.remarks, "remarks", { min: 1, max: 1000 });
});

export const convertAdmissionLeadValidator = createValidator((req) => {
  ensureNoTenantId(req.body);
  ensureUuid(req.body.sectionId, "sectionId");
  ensureDate(req.body.admissionDate, "admissionDate");
  ensureBoolean(req.body.createLogin, "createLogin");

  if (req.body.createLogin === true) {
    ensureString(req.body.email, "email", { min: 5, max: 100 });
    ensureString(req.body.password, "password", { min: 6, max: 50 });
  }
});
