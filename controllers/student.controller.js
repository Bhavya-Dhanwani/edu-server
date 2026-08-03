import { StudentService } from "../services/student.service.js";
import { catchAsync } from "../utils/catchAsync.js";

const studentService = new StudentService();

export class StudentController {
  create = catchAsync(async (req, res) => {
    const data = await studentService.createStudent(req.tenantId, {
      ...req.body,
      requestedBy: req.user.id,
    });
    res.status(201).json({ success: true, data });
  });

  getAll = catchAsync(async (req, res) => {
    const result = await studentService.getAllStudents(req.tenantId, req.query);
    res.status(200).json({ success: true, ...result });
  });

  // Get Students NOT assigned to any section
  getUnassigned = catchAsync(async (req, res) => {
    const result = await studentService.getUnassignedStudents(req.tenantId, req.query);
    res.status(200).json({ success: true, ...result });
  });

  getMe = catchAsync(async (req, res) => {
    const data = await studentService.getStudentByUserId(req.user.id, req.tenantId);
    res.status(200).json({ success: true, data });
  });

  getOne = catchAsync(async (req, res) => {
    const data = await studentService.getStudentById(req.params.id, req.tenantId);
    res.status(200).json({ success: true, data });
  });

  update = catchAsync(async (req, res) => {
    const data = await studentService.updateStudent(
      req.params.id,
      req.tenantId,
      req.body,
    );
    res.status(200).json({ success: true, data });
  });

  delete = catchAsync(async (req, res) => {
    const result = await studentService.deleteStudent(req.params.id, req.tenantId);
    res.status(200).json({ success: true, ...result });
  });
}
