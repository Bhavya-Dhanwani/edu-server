  import { Op } from "sequelize";
  import { AppError } from "../utils/AppError.js";

  const toPositiveInteger = (value, fallback) => {
    const number = Number.parseInt(value, 10);
    return Number.isInteger(number) && number > 0 ? number : fallback;
  };

  export class BaseRepository {
    constructor(model) {
      this.model = model;
    }

    // Argument change: 'include' ki jagah 'options' use karo jo flexible ho
    async findById(id, tenantId, options = {}) {
      // Agar options ek array hai (puraane code ke liye support), toh use include bana do
      const queryOptions = Array.isArray(options) ? { include: options } : options;
      
      const record = await this.model.findOne({ 
        where: { id, tenantId }, 
        ...queryOptions // Isme transaction aur include dono sahi jagah jayenge
      });

      if (!record) throw new AppError(`${this.model.name} not found`, 404);
      return record;
    }

    async findAll(tenantId, filter = {}, options = {}) {
      // Same logic: options handles include and transaction
      const queryOptions = Array.isArray(options) ? { include: options } : options;

      return await this.model.findAll({ 
        where: { ...filter, tenantId }, 
        ...queryOptions 
      });
    }

    async search(tenantId, searchTerm, searchableFields = [], options = {}) {
      const {
        filters = {},
        page = 1,
        limit = 10,
        order = [["createdAt", "DESC"]],
        include,
        distinct,
        ...queryOptions
      } = options;

      const normalizedTerm = String(searchTerm ?? "").trim();
      const fields = Array.isArray(searchableFields)
        ? searchableFields.filter(Boolean)
        : [];
      const safePage = toPositiveInteger(page, 1);
      const safeLimit = toPositiveInteger(limit, 10);
      const offset = (safePage - 1) * safeLimit;

      if (!fields.length) {
        throw new AppError("Search fields are required", 400);
      }

      const whereClauses = [];

      if (tenantId !== undefined && tenantId !== null) {
        whereClauses.push({ tenantId });
      }

      if (filters && Reflect.ownKeys(filters).length) {
        whereClauses.push(filters);
      }

      if (normalizedTerm && fields.length) {
        whereClauses.push({
          [Op.or]: fields.map((field) => ({
            [field]: { [Op.iLike]: `%${normalizedTerm}%` },
          })),
        });
      }

      const where = whereClauses.length ? { [Op.and]: whereClauses } : {};

      const { count, rows } = await this.model.findAndCountAll({
        where,
        offset,
        limit: safeLimit,
        order,
        include,
        distinct: distinct ?? Boolean(include),
        ...queryOptions,
      });

      const total = Array.isArray(count) ? count.length : count;

      return {
        total,
        page: safePage,
        limit: safeLimit,
        pages: Math.ceil(total / safeLimit),
        data: rows,
      };
    }

    async create(data, options = {}) {
      return await this.model.create(data, options);
    }

    // Update aur Delete mein bhi options (transaction) pass karna zaroori hai
    async update(id, tenantId, data, options = {}) {
      const record = await this.findById(id, tenantId, options);
      return await record.update(data, options);
    }
  
    async delete(id, tenantId, options = {}) {
      const record = await this.findById(id, tenantId, options);
      return await record.destroy(options);
    }
  }
