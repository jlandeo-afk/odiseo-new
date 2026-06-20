import { Test, TestingModule } from '@nestjs/testing';
import { AcademicTimeUseCase } from './academic-time.use-case';
import { IAcademicTimeRepository } from './repositories/i-academic-time.repository';

describe('AcademicTimeUseCase', () => {
  let useCase: AcademicTimeUseCase;
  let repository: IAcademicTimeRepository;

  beforeEach(async () => {
    const mockRepository = {
      createCycle: jest.fn(),
      getCycleWithSyllabus: jest.fn(),
      softDeleteCycle: jest.fn(),
      getTemplatesByCycle: jest.fn(),
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicTimeUseCase,
        {
          provide: IAcademicTimeRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<AcademicTimeUseCase>(AcademicTimeUseCase);
    repository = module.get<IAcademicTimeRepository>(IAcademicTimeRepository);
  });

  it('should calculate end date and create weeks correctly', async () => {
    // Math: start date = "2026-03-01", daysPerWeek = 7
    // week 1: 03-01 to 03-07
    // week 2: 03-08 to 03-14 ... etc
    const dto = {
      name: 'Ciclo 2026',
      year: 2026,
      startDate: '2026-03-01',
      daysPerWeek: 7,
      totalWeeks: 2,
    };

    (repository.createCycle as jest.Mock).mockResolvedValue({
      id: 'cycle-123',
    });

    const result = await useCase.createCycle(dto);

    expect(repository.createCycle).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ciclo 2026',
        year: 2026,
        startDate: '2026-03-01',
        endDate: '2026-03-14', // 14 days total, so it ends on the 14th
        daysPerWeek: 7,
        totalWeeks: 2,
        weeks: expect.arrayContaining([
          expect.objectContaining({
            weekNumber: 1,
            startDate: '2026-03-01',
            endDate: '2026-03-07',
          }),
          expect.objectContaining({
            weekNumber: 2,
            startDate: '2026-03-08',
            endDate: '2026-03-14',
          }),
        ]),
      }),
    );
    expect(typeof result.id).toBe('string');
  });

  describe('Templates CRUD', () => {
    it('should fetch templates for a cycle', async () => {
      const mockTemplates = [
        { id: 'template-1', name: 'Práctica Semanal', scope: 'CURRENT_WEEK', courses: [] },
      ];
      (repository.getTemplatesByCycle as jest.Mock).mockResolvedValue(mockTemplates);

      const result = await useCase.getTemplates('cycle-123');

      expect(repository.getTemplatesByCycle).toHaveBeenCalledWith('cycle-123');
      expect(result).toEqual(mockTemplates);
    });

    it('should create a template with courses', async () => {
      (repository.getCycleWithSyllabus as jest.Mock).mockResolvedValue({ id: 'cycle-123' });
      (repository.createTemplate as jest.Mock).mockResolvedValue(undefined);

      const dto = {
        name: 'Examen Quincenal',
        scope: 'ACCUMULATIVE',
        accumulationWeeks: 2,
        courses: [
          { courseId: 'algebra-uuid', questionsQuantity: 10 },
        ],
      };

      const result = await useCase.createTemplate('cycle-123', dto);

      expect(repository.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          cycleId: 'cycle-123',
          name: 'Examen Quincenal',
          scope: 'ACCUMULATIVE',
          accumulationWeeks: 2,
          courses: expect.arrayContaining([
            expect.objectContaining({
              courseId: 'algebra-uuid',
              questionsQuantity: 10,
            }),
          ]),
        }),
      );
      expect(typeof result.id).toBe('string');
    });

    it('should update a template', async () => {
      (repository.updateTemplate as jest.Mock).mockResolvedValue(undefined);

      const dto = {
        name: 'Práctica Semanal Editada',
        scope: 'FULL_ACCUMULATIVE',
        courses: [
          { courseId: 'algebra-uuid', questionsQuantity: 12 },
        ],
      };

      const result = await useCase.updateTemplate('cycle-123', 'template-1', dto);

      expect(repository.updateTemplate).toHaveBeenCalledWith(
        'template-1',
        expect.objectContaining({
          name: 'Práctica Semanal Editada',
          scope: 'FULL_ACCUMULATIVE',
          courses: expect.arrayContaining([
            expect.objectContaining({
              courseId: 'algebra-uuid',
              questionsQuantity: 12,
            }),
          ]),
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should delete a template', async () => {
      (repository.deleteTemplate as jest.Mock).mockResolvedValue(undefined);

      const result = await useCase.deleteTemplate('cycle-123', 'template-1');

      expect(repository.deleteTemplate).toHaveBeenCalledWith('template-1');
      expect(result.success).toBe(true);
    });
  });
});
