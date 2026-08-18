import { AcademicYearRepository } from "../../repositories/Academic/academicYear.repository.js";

const academicYearRepo = new AcademicYearRepository();

export const requireOpenAcademicYear = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required." });
    }

    // 1. Fetch current active academic year for tenant
    let academicYear = await academicYearRepo.findCurrentYear(tenantId);
    if (!academicYear) {
      const today = new Date().toISOString().split("T")[0];
      academicYear = await academicYearRepo.findByDate(today, tenantId);
    }
    if (!academicYear) {
      academicYear = await academicYearRepo.findLatest(tenantId);
    }

    if (!academicYear) {
      return res.status(400).json({
        message: "No active academic year is configured.",
      });
    }

    // 2. Check if current academic year is locked
    if (academicYear.isLocked) {
      return res.status(409).json({
        message: "The current academic year is locked.",
      });
    }

    // 3. Attach session context to request & populate req.body.academicYearId if not provided
    req.academicYear = academicYear;
    req.academicYearId = academicYear.id;

    if (req.body && typeof req.body === "object" && !req.body.academicYearId) {
      req.body.academicYearId = academicYear.id;
    }

    next();
  } catch (error) {
    next(error);
  }
};
