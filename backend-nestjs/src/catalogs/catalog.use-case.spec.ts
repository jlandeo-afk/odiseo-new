import { Test, TestingModule } from '@nestjs/testing';
import { CatalogUseCase } from './catalog.use-case';
import { ICatalogRepository } from './repositories/i-catalog.repository';

describe('CatalogUseCase', () => {
  let useCase: CatalogUseCase;
  let mockCatalogRepository: any;

  beforeEach(async () => {
    mockCatalogRepository = {
      getActiveHierarchy: jest.fn().mockResolvedValue([
        {
          id: 'course-1',
          coreName: 'Course 1',
          localAlias: null,
          topics: [
            { id: 'topic-1', coreName: 'Topic 1', localAlias: 'Local Topic 1', isActive: true, subtopics: [] },
            { id: 'topic-2', coreName: 'Topic 2', localAlias: null, isActive: false, subtopics: [] }
          ]
        }
      ]),
      updateTopicLocalData: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogUseCase,
        {
          provide: ICatalogRepository,
          useValue: mockCatalogRepository,
        },
      ],
    }).compile();

    useCase = module.get<CatalogUseCase>(CatalogUseCase);
  });

  it('debería estar definido', () => {
    expect(useCase).toBeDefined();
  });

  it('debería retornar la jerarquía mapeada correctamente usando alias si existe', async () => {
    const result = await useCase.getUIHierarchy();
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Course 1');
    expect(result[0].topics).toHaveLength(1); // topic-2 is inactive
    expect(result[0].topics[0].name).toBe('Local Topic 1');
  });

  it('debería aislar la actualización local en el repositorio', async () => {
    await useCase.updateTopicLocalInfo('topic-1', 'New Alias', false);
    
    expect(mockCatalogRepository.updateTopicLocalData).toHaveBeenCalledWith('topic-1', {
      localAlias: 'New Alias',
      isActive: false
    });
  });
});
