import sequelize from "../config/db.js";
import { UserRepository } from "../repositories/user.repository.js";
import { UserRoleRepository } from "../repositories/user-role.repository.js";
import { AppError } from "../utils/AppError.js";
import { BcryptHelper } from "../utils/bcrypt.js";
import { JwtHelper } from "../utils/jwt.js";

const userRepo = new UserRepository();
const userRoleRepo = new UserRoleRepository();

export class UserService {
 async createUser(payload, options = {}) {
    const email = payload.email?.toLowerCase().trim();

    // 1. Check if email already exists
    const existingUser = await userRepo.findByEmail(email, payload.tenantId);
    if (existingUser) {
      throw new AppError("Email already exists", 409);
    }

    // 2. Hash password with bcrypt
    const hashedPassword = await BcryptHelper.hashPassword(payload.password);

    // 🔥 TRANSACTION LOGIC: Use passed transaction or create a new one
    let transaction = options.transaction;
    let localTransaction = false;

    if (!transaction) {
      transaction = await sequelize.transaction();
      localTransaction = true;
    }

    try {
      const userData = {
        email,
        password: hashedPassword,
        cognitoSub: payload.cognitoSub || null,
        firstName: payload.firstName?.trim(),
        lastName: payload.lastName?.trim(),
        phone: payload.phone?.trim() || null,
        status: payload.status || "pending_verification",
        emailVerified: payload.emailVerified || false,
        preferences: payload.preferences || { language: "en", theme: "system" },
        tenantId: payload.tenantId,
      };

      // 🔥 Pass the transaction to repository
      const user = await userRepo.create(userData, { transaction });

      // Only commit if this function started the transaction
      if (localTransaction) {
        await transaction.commit();
      }

      return this.formatUserResponse(user);
    } catch (error) {
      // Only rollback if this function started the transaction
      if (localTransaction && !transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
}

  async getAllUsers(tenantId, filter = {}) {
    const users = await userRepo.findAllWithAssociations(tenantId, filter);
    return users.map((user) => this.formatUserResponse(user));
  }

  async getUserById(userId, tenantId) {
    const user = await userRepo.findByIdWithAssociations(userId, tenantId);
    return this.formatUserResponse(user);
  }

  async getUsersByType(userType, tenantId, filter = {}) {
    const users = await userRepo.findByUserType(userType, tenantId, filter);
    return users.map((user) => this.formatUserResponse(user));
  }

  async getActiveUsers(tenantId, filter = {}) {
    const users = await userRepo.findActiveUsers(tenantId, filter);
    return users.map((user) => this.formatUserResponse(user));
  }

  async updateUser(userId, tenantId, payload) {
    const user = await userRepo.findById(userId, tenantId);

    // Check email uniqueness if updating email
    if (payload.email && payload.email.toLowerCase().trim() !== user.email) {
      const existingUser = await userRepo.findByEmail(
        payload.email.toLowerCase().trim(),
        tenantId,
      );
      if (existingUser) {
        throw new AppError("Email already exists", 409);
      }
    }

    const updateData = {};

    if (payload.firstName) updateData.firstName = payload.firstName.trim();
    if (payload.lastName) updateData.lastName = payload.lastName.trim();
    if (payload.email) updateData.email = payload.email.toLowerCase().trim();
    if (payload.phone !== undefined)
      updateData.phone = payload.phone?.trim() || null;
    if (payload.preferences) updateData.preferences = payload.preferences;
    if (payload.cognitoSub) updateData.cognitoSub = payload.cognitoSub;

    await userRepo.update(userId, tenantId, updateData);
    const updated = await userRepo.findByIdWithAssociations(userId, tenantId);
    return this.formatUserResponse(updated); 
  }

  async updateUserStatus(userId, tenantId, status) {
    const validStatuses = [
      "active",
      "inactive",
      "suspended",
      "pending_verification",
    ];
    if (!validStatuses.includes(status)) {
      throw new AppError("Invalid status value", 400);
    }

    const user = await userRepo.updateStatus(userId, tenantId, status);j
    return this.formatUserResponse(user);
  }

  async verifyUserEmail(userId, tenantId) {
    const user = await userRepo.verifyEmail(userId, tenantId);
    return this.formatUserResponse(user);
  }

  async updatePassword(userId, tenantId, hashedPassword) {
    const user = await userRepo.updatePassword(
      userId,
      tenantId,
      hashedPassword,
    );
    return this.formatUserResponse(user);
  }

  async updateLastLogin(userId, tenantId) {
    await userRepo.updateLastLogin(userId, tenantId);
  }

  async deleteUser(userId, tenantId) {
    // Soft delete - paranoid mode
    await userRepo.softDelete(userId, tenantId);
  }

  async restoreUser(userId, tenantId) {
    const user = await userRepo.restore(userId, tenantId);
    return this.formatUserResponse(user);
  }

  async loginByEmail(email, password) {
    const trimmedEmail = email?.toLowerCase().trim();
    
    if (!trimmedEmail) {
      throw new AppError("Email is required", 400);
    }

    if (!password) {
      throw new AppError("Password is required", 400);
    }

    // Search by email only, across entire user table (no tenantId filter)
    const user = await userRepo.findByEmail(trimmedEmail);
    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    // Verify password with bcrypt
    const isPasswordValid = await BcryptHelper.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new AppError("Invalid email or password", 401);
    }

    // Update last login timestamp (global search)
    await userRepo.updateLastLoginGlobal(user.id);

    // Fetch user with associations for complete profile (global search)
    const userWithAssociations = await userRepo.findByIdGlobal(user.id);
    const userResponse = this.formatUserResponse(userWithAssociations);
    const firstRoleId = userResponse.roles?.[0]?.id ?? null;
    
    // Generate JWT token
    const token = JwtHelper.generateToken({
      id: userWithAssociations.id,
      email: userWithAssociations.email,
      roleId: firstRoleId,
      userType: userWithAssociations.userType,
      tenantId: userWithAssociations.tenantId,
    });

    return {
      ...userResponse,
      token,
    };
  }

  formatUserResponse(user) {
    // Format roles with permissions
    const formattedRoles = (user.roles || []).map(role => ({
      id: role.id,
      name: role.name,
      roleType: role.roleType,
      permissions: role.permissions || [],
    }));

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      userType: user.userType,
      status: user.status,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      preferences: user.preferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: formattedRoles,
      tenant: user.organization ? {
        id: user.organization.id,
        name: user.organization.name,
        organizationType: user.organization.organizationType,
        officialEmail: user.organization.officialEmail,
        subdomain: user.organization.subdomain,
        settings: user.organization.settings,
      } : null,
    };
  }
}
