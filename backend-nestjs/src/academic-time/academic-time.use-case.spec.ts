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
    expect(result.id).toBe('cycle-123');
  });
});
