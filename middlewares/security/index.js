import { Permission, Role, Tenant } from "../../models/index.js";
import { JwtHelper } from "../../utils/jwt.js";

export const identifyUser = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Login required" });

    const decoded = JwtHelper.verifyToken(token);
    req.user = decoded;

    const tenant_id = decoded.tenantId;
    console.log("this is tenantId --> ", tenant_id, "and ", decoded);
    let tenant = null;
    if (tenant_id) {
      tenant = await Tenant.findOne({
        where: { id: tenant_id, status: "active" },
      });
      if (!tenant)
        return res.status(404).json({ message: "Institute not found" });
      req.tenantId = tenant.id;
    }
    const isSuperAdmin = req.user.roleId == process.env.SUPER_ADMIN_ROLE_ID;
    if (!isSuperAdmin) {
      if (!tenant) {
        return res.status(400).json({ message: "Tenant context required" });
      }

      if (req.user.tenantId !== tenant.id) {
        return res.status(403).json({ message: "Wrong request" });
      }
    }
        console.log(req.user , 
          "this is user data "
        )
    if (isSuperAdmin) {
      req.user.permissions = ["*"];
    } else {
      try {
        const roleWithPermissions = await Role.findOne({
          where: { id: req.user.roleId, tenantId: tenant.id },
          include: [
            { model: Permission, as: "permissions", attributes: ["name"] },
          ],
        });
        req.user.permissions =
          roleWithPermissions?.permissions?.map((p) => p.name) || [];
      } catch (error) {
        req.user.permissions = [];
      }
    }

    next();
  } catch (err) {
    console.error("Authentication Error:", err);
    return res.status(401).json({ message: err.message || "Session invalid" });
  }
};

export const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res
        .status(500)
        .json({ message: "Internal Auth Error: Permissions not resolved" });
    }
    if (req.user.permissions.includes("*")) {
      return next();
    }
    console.log(req.user.permissions);
    console.log(requiredPermission);
    if (!req.user.permissions.includes(requiredPermission)) {
      return res.status(403).json({
        message: `Forbidden: You do not have the '${requiredPermission}' permission`,
      });
    }

    next();
  };
};

export { requireOpenAcademicYear } from "./requireOpenAcademicYear.middleware.js";


