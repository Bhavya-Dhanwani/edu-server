import { AdmissionLeadService } from "../../services/admissions/admissionLead.service.js";
import { catchAsync } from "../../utils/catchAsync.js";

const leadService = new AdmissionLeadService();

export class AdmissionLeadController {
  create = catchAsync(async (req, res) => {
    const data = await leadService.createLead(req.tenantId, {
      ...req.body,
      assignedToId: req.body.assignedToId || req.user?.id || null,
    });
    res.status(201).json({ success: true, data });
  });

  getAll = catchAsync(async (req, res) => {
    const result = await leadService.getAllLeads(req.tenantId, req.query);
    res.status(200).json({ success: true, ...result });
  });

  getOne = catchAsync(async (req, res) => {
    const data = await leadService.getLeadById(req.params.id, req.tenantId);
    res.status(200).json({ success: true, data });
  });

  update = catchAsync(async (req, res) => {
    const data = await leadService.updateLead(
      req.params.id,
      req.tenantId,
      req.body,
    );
    res.status(200).json({ success: true, data });
  });

  updateStatus = catchAsync(async (req, res) => {
    const data = await leadService.updateLeadStatus(
      req.params.id,
      req.tenantId,
      req.body,
      req.user,
    );
    res.status(200).json({ success: true, data });
  });

  convert = catchAsync(async (req, res) => {
    const data = await leadService.convertLeadToStudent(
      req.params.id,
      req.tenantId,
      req.body,
      req.user,
    );
    res.status(200).json({
      success: true,
      message: "Admission lead converted to student successfully",
      data,
    });
  });
}
