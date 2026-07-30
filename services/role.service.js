import sequelize from "../config/db.js";
console.log("ROLE SERVICE LOADED");
import { PermissionRepository } from "../repositories/permission.repository.js";
import { RoleRepository } from "../repositories/role.repository.js";
import { AppError } from "../utils/AppError.js";
import { RolePermission } from "../models/index.js";
import { ROLE_TYPES } from "../utils/role-type.js";
import {
  ADMIN_PERMISSIONS,
  ROLE_MASTER_CONFIG,
} from "../config/masterPermission.js";

const roleRepo = new RoleRepository();
const permissionRepo = new PermissionRepository();

const ROLE_TYPE_SET = new Set(ROLE_TYPES);

const normalizeRoleType = (value, { required = false } = {}) => {
  const normalizedValue =
    typeof value === "string" ? value.trim().toLowerCase() : "";

  if (!normalizedValue) {
    if (required) {
      throw new AppError("roleType is required", 400);
    }
    return null;
  }

  if (!ROLE_TYPE_SET.has(normalizedValue)) {
    throw new AppError(
      `roleType must be one of: ${ROLE_TYPES.join(", ")}`,
      400,
    );
  }

  return normalizedValue;
};

export class RoleService {
  // src/services/role.service.js

  async createRole(payload, options = {}) {
    const roleType = normalizeRoleType(payload.roleType, { required: true });
    const tenantId = payload.tenantId?.trim() || null;
    const permissionNames = [...new Set(payload.permissionIds || [])];
    console.log("Creating Role:", payload.name);

    console.log("Permission Names:", permissionNames);

    const permissions = permissionNames.length
      ? await permissionRepo.findByNames(permissionNames)
      : [];

    const foundNames = permissions.map((p) => p.name);

    console.log("Permissions Found:", foundNames);

    const missingPermissions = permissionNames.filter(
      (name) => !foundNames.includes(name),
    );

    console.log("Missing Permissions:", missingPermissions);

    if (permissions.length !== permissionNames.length) {
      throw new AppError(
        `One or more permissions are invalid: ${missingPermissions.join(", ")}`,
        400,
      );
    }
    console.log("Found:", permissions.length);

    const permissionIds = permissions.map((permission) => permission.id);

    // 🔥 LOGIC: Agar options mein transaction hai toh wahi use karo,
    // nahi toh nayi transaction create karo.
    let transaction = options.transaction;
    let localTransaction = false;

    if (!transaction) {
      transaction = await sequelize.transaction();
      localTransaction = true; // Taaki humein pata ho commit kab karna hai
    }

    try {
      const role = await roleRepo.create(
        {
          name: payload.name.trim(),
          roleType,
          slug: payload.slug,
          description: payload.description?.trim() || null,
          isSystem: payload.isSystem ?? false,
          hierarchyLevel: payload.hierarchyLevel ?? 10,
          tenantId,
          customFields: payload.customFields || {},
          metadata: payload.metadata || {},
        },
        { transaction },
      );

      await roleRepo.attachPermissions(role.id, permissionIds, { transaction });

      // 🔥 Sirf tabhi commit karo agar transaction isi function ne banayi thi
      if (localTransaction) {
        await transaction.commit();
      }

      return this.formatRoleResponse(role, permissions);
    } catch (error) {
      // 🔥 Rollback sirf local transaction ko karo
      if (localTransaction && !transaction.finished) {
        await transaction.rollback();
      }
      throw error; // Error upar pass karo taaki registerTenant bhi rollback ho sake
    }
  }

  async getAllRoles(tenantId, filter = {}) {
    const roles = await roleRepo.findAll(tenantId, filter, [
      {
        association: "permissions",
        attributes: [
          "id",
          "name",
          "action",
          "resource",
          "module",
          "description",
        ],
        through: { attributes: [] },
      },
    ]);
    return roles.map((role) =>
      this.formatRoleResponse(role, role.permissions || []),
    );
  }

  async provisionDefaultTenantRoles(tenantId, transaction) {
    const adminRole = await this.createRole(
      {
        name: "Platform Admin",
        roleType: "platform",
        slug: null,
        hierarchyLevel: 1,
        isSystem: true,
        tenantId,
        permissionIds: ADMIN_PERMISSIONS,
      },
      { transaction },
    );

    for (const [slug, config] of Object.entries(ROLE_MASTER_CONFIG)) {
      await this.createRole(
        {
          name: config.name,
          roleType: config.roleType,
          slug: slug,
          hierarchyLevel: config.hierarchyLevel,
          isSystem: true,
          tenantId,
          permissionIds: config.permissions,
        },
        { transaction },
      );
    }
    return adminRole;
  }

  //assign permission
  // In role.service.js - Add this method to your RoleService class

  async assignPermissionsToRole(roleId, tenantId, permissionIds) {
    const role = await roleRepo.findById(roleId, tenantId);

    if (role.isSystem) {
      throw new AppError("Cannot modify permissions for system roles", 400);
    }

    // Validate permission IDs
    const uniquePermissionIds = [...new Set(permissionIds || [])];
    if (!uniquePermissionIds.length) {
      throw new AppError("At least one permission ID is required", 400);
    }

    const permissions = await permissionRepo.findByIds(uniquePermissionIds);
    if (permissions.length !== uniquePermissionIds.length) {
      throw new AppError("One or more permissionIds are invalid", 400);
    }

    const transaction = await sequelize.transaction();

    try {
      // Remove existing permissions
      await RolePermission.destroy({
        where: { roleId },
        transaction,
      });

      // Attach new permissions
      await roleRepo.attachPermissions(roleId, uniquePermissionIds, {
        transaction,
      });

      await transaction.commit();

      // Return updated role with permissions
      return this.getRoleById(roleId, tenantId);
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  async getRoleById(roleId, tenantId) {
    const role = await roleRepo.findById(roleId, tenantId, [
      {
        association: "permissions",
        attributes: [
          "id",
          "name",
          "action",
          "resource",
          "module",
          "description",
        ],
        through: { attributes: [] },
      },
    ]);
    return this.formatRoleResponse(role, role.permissions || []);
  }

  async getPermissionsByRole(roleId, tenantId) {
    const role = await roleRepo.findById(roleId, tenantId, [
      {
        association: "permissions",
        attributes: [
          "id",
          "name",
          "action",
          "resource",
          "module",
          "description",
        ],
        through: { attributes: [] },
      },
    ]);
    return role.permissions || [];
  }

  async updateRole(roleId, tenantId, payload) {
    const role = await roleRepo.findById(roleId, tenantId);
    const nextRoleType =
      payload.roleType !== undefined
        ? normalizeRoleType(payload.roleType, { required: true })
        : null;

    const updateData = {
      name: payload.name?.trim() || role.name,
      description: payload.description?.trim() || role.description,
      hierarchyLevel: payload.hierarchyLevel ?? role.hierarchyLevel,
      customFields: payload.customFields || role.customFields,
      metadata: payload.metadata || role.metadata,
    };

    if (nextRoleType) {
      updateData.roleType = nextRoleType;
    }

    await roleRepo.update(roleId, tenantId, updateData);
    return this.getRoleById(roleId, tenantId);
  }

  async updateRolePermissions(roleId, tenantId, permissionIds) {
    const role = await roleRepo.findById(roleId, tenantId);

    if (role.isSystem) {
      throw new AppError("Cannot modify permissions for system roles", 400);
    }

    // Validate permission IDs
    const uniquePermissionIds = [...new Set(permissionIds || [])];
    if (uniquePermissionIds.length) {
      const permissions = await permissionRepo.findByIds(uniquePermissionIds);
      if (permissions.length !== uniquePermissionIds.length) {
        throw new AppError("One or more permissionIds are invalid", 400);
      }
    }

    const transaction = await sequelize.transaction();
    try {
      // Remove existing permissions
      await RolePermission.destroy({ where: { roleId } }, { transaction });

      // Attach new permissions if any
      if (uniquePermissionIds.length) {
        await roleRepo.attachPermissions(roleId, uniquePermissionIds, {
          transaction,
        });
      }

      await transaction.commit();
      return this.getRoleById(roleId, tenantId);
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  formatRoleResponse(role, permissions) {
    return {
      id: role.id,
      tenantId: role.tenantId,
      name: role.name,
      roleType: role.roleType,
      slug: role.slug,
      description: role.description,
      isSystem: role.isSystem,
      hierarchyLevel: role.hierarchyLevel,
      customFields: role.customFields,
      metadata: role.metadata,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: permissions.map((permission) => ({
        id: permission.id,
        name: permission.name,
        action: permission.action,
        resource: permission.resource,
        module: permission.module,
        description: permission.description,
      })),
    };
  }
}
