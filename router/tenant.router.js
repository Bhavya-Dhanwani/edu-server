import express from "express";
import {
  archiveTenantValidator,
  createTenantValidator,
  listTenantsValidator,
  retryTenantProvisioningValidator,
  updateTenantBrandingValidator,
  updateTenantProfileValidator,
  updateTenantStatusValidator,
  uploadTenantBrandingAssetsValidator,
} from "../middlewares/validators/tenant.validator.js";
import { TenantController } from "../controllers/tenant.controller.js";
import {
  checkPermission,
  identifyUser,
} from "../middlewares/security/index.js";

const router = express.Router();
const ctrl = new TenantController();

router
  .route("/")
  .get(
    identifyUser,
    checkPermission("read:tenants"),
    listTenantsValidator,
    ctrl.getAll,
  )
  .post(createTenantValidator, ctrl.create);

router
  .route("/:id")
  .get(identifyUser, checkPermission("read:tenants"), ctrl.getOne);

router.patch(
  "/:id/profile",
  identifyUser,
  checkPermission("update:tenants"),
  updateTenantProfileValidator,
  ctrl.updateProfile,
);
router.patch(
  "/:id/status",
  identifyUser,
  checkPermission("update:tenants"),
  updateTenantStatusValidator,
  ctrl.updateStatus,
);
router.patch(
  "/:id/archive",
  identifyUser,
  checkPermission("delete:tenants"),
  archiveTenantValidator,
  ctrl.archive,
);
router.patch(
  "/:id/branding",
  identifyUser,
  checkPermission("update:tenants"),
  updateTenantBrandingValidator,
  ctrl.updateBranding,
);
router.post(
  "/:id/branding/assets",
  identifyUser,
  checkPermission("update:tenants"),
  uploadTenantBrandingAssetsValidator,
  ctrl.uploadBrandingAssets,
);
router.get(
  "/:id/provisioning",
  identifyUser,
  checkPermission("read:tenants"),
  ctrl.getProvisioning,
);
router.post(
  "/:id/provisioning/retry",
  identifyUser,
  checkPermission("update:tenants"),
  retryTenantProvisioningValidator,
  ctrl.retryProvisioning,
);

export default router;
