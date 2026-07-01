import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CatalogCronService } from './catalog.cron';
import { ICatalogRepository } from './repositories/i-catalog.repository';

describe('CatalogCronService', () => {
  let service: CatalogCronService;
  let repository: ICatalogRepository;

  beforeEach(async () => {
    const mockRepository = {
      upsertCatalogs: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('http://localhost:3000/api/catalogs'),
    };

    const mockCacheManager = {
      set: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogCronService,
        {
          provide: ICatalogRepository,
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CatalogCronService>(CatalogCronService);
    repository = module.get<ICatalogRepository>(ICatalogRepository);

    // Mock global fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fetch data from Core API and upsert via repository', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        courses: [{ id: '1', name: 'Course 1', topics: [] }],
      }),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await service.syncCatalogs();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
    );
    expect(repository.upsertCatalogs).toHaveBeenCalledWith(expect.any(Object));
  });

  it('should log an error if Core API fails', async () => {
    const mockResponse = {
      ok: false,
      statusText: 'Internal Server Error',
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const loggerSpy = jest.spyOn(service['logger'], 'error');

    await service.syncCatalogs();

    expect(repository.upsertCatalogs).not.toHaveBeenCalled();
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch catalogs from Core API'),
      expect.any(String),
    );
  });
});
