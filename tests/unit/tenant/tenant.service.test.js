import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockTenantRepo } = vi.hoisted(() => {
  return {
    mockTenantRepo: {
      listWithMetrics: vi.fn(),
    },
  };
});

vi.mock('../../../config/db.js', () => {
  return {
    default: {
      transaction: vi.fn(),
    },
  };
});

vi.mock('../../../repositories/tenant.repository.js', () => {
  return {
    TenantRepository: vi.fn(function () {
      return mockTenantRepo;
    }),
  };
});

vi.mock('../../../services/role.service.js', () => {
  return {
    RoleService: vi.fn(function () {
      return {};
    }),
  };
});

vi.mock('../../../services/user.service.js', () => {
  return {
    UserService: vi.fn(function () {
      return {};
    }),
  };
});

vi.mock('../../../services/user-role.service.js', () => {
  return {
    UserRoleService: vi.fn(function () {
      return {};
    }),
  };
});

import { TenantService } from '../../../services/tenant.service.js';

describe('TenantService', () => {
  let service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TenantService();
  });

  // ✅ 1. Happy path
  it('should return tenants list', async () => {
    const mockData = { data: [{ id: '1' }], meta: {} };

    mockTenantRepo.listWithMetrics.mockResolvedValue(mockData);

    const result = await service.listTenants({});

    expect(mockTenantRepo.listWithMetrics).toHaveBeenCalledWith({});
    expect(result).toEqual(mockData);
  });

  // ✅ 2. Pass query params correctly
  it('should pass query params to repository', async () => {
    const query = { page: 2, limit: 10 };

    mockTenantRepo.listWithMetrics.mockResolvedValue({ data: [], meta: {} });

    await service.listTenants(query);

    expect(mockTenantRepo.listWithMetrics).toHaveBeenCalledWith(query);
  });

  // ✅ 3. Handle empty result
  it('should handle empty tenants list', async () => {
    const mockData = { data: [], meta: { total: 0 } };

    mockTenantRepo.listWithMetrics.mockResolvedValue(mockData);

    const result = await service.listTenants({});

    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
  });

  // ✅ 4. Repository throws error
  it('should throw if repository fails', async () => {
    mockTenantRepo.listWithMetrics.mockRejectedValue(new Error('DB Error'));

    await expect(service.listTenants({})).rejects.toThrow('DB Error');
  });

  // ✅ 5. Ensure method is async-safe
  it('should return a promise', async () => {
    mockTenantRepo.listWithMetrics.mockResolvedValue({ data: [], meta: {} });
    const result = service.listTenants({});
    expect(result).toBeInstanceOf(Promise);
    await result; // await to handle/catch any potential errors and ensure it resolves
  });
});