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
          name: 'Course 1',
          topics: [
            {
              id: 'topic-1',
              name: 'Topic 1',
              isActive: true,
              subtopics: [],
            },
            {
              id: 'topic-2',
              name: 'Topic 2',
              isActive: false,
              subtopics: [],
            },
          ],
        },
      ]),
      updateTopicLocalVisibility: jest.fn().mockResolvedValue(undefined),
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

  it('debería retornar la jerarquía correctamente', async () => {
    const result = await useCase.getHierarchy();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Course 1');
    expect(result[0].topics).toHaveLength(2);
    expect(result[0].topics[0].name).toBe('Topic 1');
    expect(result[0].topics[0].isActive).toBe(true);
  });

  it('debería aislar la actualización local en el repositorio', async () => {
    await useCase.updateTopicVisibility('topic-1', false);

    expect(mockCatalogRepository.updateTopicLocalVisibility).toHaveBeenCalledWith(
      'topic-1',
      false,
    );
  });
});
