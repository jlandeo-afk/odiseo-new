import { ConflictException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { Company } from './entities/tenant.entity';

describe('TenantsService', () => {
  let service: TenantsService;
  let mockCompanyRepo: any;
  let mockDataSource: any;

  const mockSavedCompany: Partial<Company> = {
    id: 'uuid-new-company',
    subdomain: 'nuevo-colegio',
    commercialName: 'Colegio Nuevo',
    logoUrl: undefined,
    primaryColor: '#6366f1',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockCompanyRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockDataSource = {
      query: jest.fn().mockResolvedValue(undefined),
    };

    service = new TenantsService(mockCompanyRepo, mockDataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findBySubdomain', () => {
    it('should return company for valid subdomain', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(mockSavedCompany);

      const result = await service.findBySubdomain('nuevo-colegio');

      expect(result).toEqual(mockSavedCompany);
      expect(mockCompanyRepo.findOne).toHaveBeenCalledWith({
        where: { subdomain: 'nuevo-colegio', isActive: true },
      });
    });

    it('should return null for unknown subdomain', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(null);

      const result = await service.findBySubdomain('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createCompany', () => {
    it('should create company and provision schema', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(null); // No duplicate
      mockCompanyRepo.create.mockReturnValue(mockSavedCompany);
      mockCompanyRepo.save.mockResolvedValue(mockSavedCompany);

      const result = await service.createCompany({
        subdomain: 'nuevo-colegio',
        commercialName: 'Colegio Nuevo',
      });

      expect(result).toEqual(mockSavedCompany);

      // Verify schema creation
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE SCHEMA IF NOT EXISTS'),
      );

      // Verify tenant tables creation
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS users'),
      );

      // Verify RBAC seeding
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO roles'),
      );
    });

    it('should throw ConflictException for duplicate subdomain', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(mockSavedCompany); // Exists!

      await expect(
        service.createCompany({
          subdomain: 'nuevo-colegio',
          commercialName: 'Duplicate',
        }),
      ).rejects.toThrow(ConflictException);

      // Should NOT create schema
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });

    it('should use correct schema name based on company id', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(null);
      mockCompanyRepo.create.mockReturnValue(mockSavedCompany);
      mockCompanyRepo.save.mockResolvedValue(mockSavedCompany);

      await service.createCompany({
        subdomain: 'nuevo-colegio',
        commercialName: 'Colegio Nuevo',
      });

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('tenant_uuid-new-company'),
      );
    });

    it('should apply default primary color when not provided', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(null);
      mockCompanyRepo.create.mockReturnValue(mockSavedCompany);
      mockCompanyRepo.save.mockResolvedValue(mockSavedCompany);

      await service.createCompany({
        subdomain: 'test-colegio',
        commercialName: 'Test',
      });

      expect(mockCompanyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryColor: '#6366f1',
        }),
      );
    });

    it('should create all required RBAC tables', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(null);
      mockCompanyRepo.create.mockReturnValue(mockSavedCompany);
      mockCompanyRepo.save.mockResolvedValue(mockSavedCompany);

      await service.createCompany({
        subdomain: 'test-colegio',
        commercialName: 'Test',
      });

      const allQueries = mockDataSource.query.mock.calls
        .map((call: any) => call[0])
        .join(' ');

      expect(allQueries).toContain('CREATE TABLE IF NOT EXISTS users');
      expect(allQueries).toContain('CREATE TABLE IF NOT EXISTS roles');
      expect(allQueries).toContain('CREATE TABLE IF NOT EXISTS permissions');
      expect(allQueries).toContain(
        'CREATE TABLE IF NOT EXISTS model_has_roles',
      );
      expect(allQueries).toContain(
        'CREATE TABLE IF NOT EXISTS role_has_permissions',
      );
    });

    it('should seed all V1 permissions', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(null);
      mockCompanyRepo.create.mockReturnValue(mockSavedCompany);
      mockCompanyRepo.save.mockResolvedValue(mockSavedCompany);

      await service.createCompany({
        subdomain: 'test-colegio',
        commercialName: 'Test',
      });

      const seedQuery = mockDataSource.query.mock.calls
        .map((call: any) => call[0])
        .join(' ');

      const expectedPermissions = [
        'view_catalogs',
        'edit_catalogs',
        'view_materials',
        'generate_material',
        'review_material',
        'view_syllabus',
        'edit_syllabus',
        'manage_academic_time',
      ];

      for (const perm of expectedPermissions) {
        expect(seedQuery).toContain(perm);
      }
    });
  });
});
