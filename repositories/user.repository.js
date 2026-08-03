import { User } from "../models/index.js";
  import { BaseRepository } from "./base.repository.js";
import { AppError } from "../utils/AppError.js";

export class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email, tenantId = null) {
    const where = { email: email.toLowerCase().trim() };
    if (tenantId) where.tenantId = tenantId;

    return await this.model.scope("withPassword").findOne({ where });
  }

  async findByCognitoSub(cognitoSub) {
    return await this.model.findOne({ where: { cognitoSub } });
  }

  async findActiveUsers(tenantId, filter = {}) {
    return await this.model.findAll({
      where: { ...filter, tenantId, status: "active" },
      attributes: { exclude: ["password"] },
    });
  }

  async findByUserType(userType, tenantId, filter = {}) {
    return await this.model.findAll({
      where: { ...filter, tenantId, userType },
      attributes: { exclude: ["password"] },
    });
  }

  async findAllWithAssociations(tenantId, filter = {}, include = []) {
    const defaultInclude = [
      {
        association: "roles",
        attributes: ["id", "name", "roleType"],
        through: { attributes: [] },
      },
    ];

    return await this.model.findAll({
      where: { ...filter, tenantId },
      attributes: { exclude: ["password"] },
      include: include.length > 0 ? include : defaultInclude,
    });
  }

  async findByIdWithAssociations(id, tenantId, include = []) {
    const defaultInclude = [
      {
        association: "roles",
        attributes: ["id", "name", "roleType"],
        through: { attributes: [] },
      },
    ];

    const user = await this.model.findOne({
      where: { id, tenantId },
      attributes: { exclude: ["password"] },
      include: include.length > 0 ? include : defaultInclude,
    });

    if (!user) throw new AppError("User not found", 404);
    return user;
  }

  async updatePassword(id, tenantId, hashedPassword) {
    const user = await this.findById(id, tenantId);
    return await user.update({ password: hashedPassword });
  }

  async updateLastLogin(id, tenantId) {
    const user = await this.findById(id, tenantId);
    return await user.update({ lastLoginAt: new Date() });
  }

  async verifyEmail(id, tenantId) {
    const user = await this.findById(id, tenantId);
    return await user.update({ emailVerified: true });
  }

  async updateStatus(id, tenantId, status) {
    const validStatuses = [
      "active",
      "inactive",
      "suspended",
      "pending_verification",
    ];
    if (!validStatuses.includes(status)) {
      throw new AppError("Invalid user status", 400);
    }
    const user = await this.findById(id, tenantId);
    return await user.update({ status });
  }

  async softDelete(id, tenantId) {
    const user = await this.findById(id, tenantId);
    return await user.destroy();
  }

  async restore(id, tenantId) {
    const user = await this.model.findOne({
      where: { id, tenantId },
      paranoid: false,
    });
    if (!user) throw new AppError("User not found", 404);
    return await user.restore();
  }

  async findByIdGlobal(id) {
    const user = await this.model.findOne({
      where: { id },
      attributes: {
        exclude: ["password"],
      },
      include: [
        {
          association: "organization",
          attributes: [
            "id",
            "name",
            "organizationType",
            "officialEmail",
            "subdomain",
            "settings",
          ],
        },
        {
          association: "roles",
          attributes: ["id", "name", "roleType"],
          through: {
            attributes: [],
          },
          include: [
            {
              association: "permissions",
              attributes: ["id", "name", "action", "resource", "module"],
              through: {
                attributes: [],
              },
            },
          ],
        },
      ],
    });``

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }

  async updateLastLoginGlobal(id) {
    const user = await this.model.findByPk(id);
    if (!user) throw new AppError("User not found", 404);
    return await user.update({ lastLoginAt: new Date() });
  }
}
