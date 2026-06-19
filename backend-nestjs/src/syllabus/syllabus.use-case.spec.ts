import { Test, TestingModule } from '@nestjs/testing';
import { SyllabusUseCase } from './syllabus.use-case';
import { I_SYLLABUS_REPOSITORY } from './repositories/i-syllabus.repository';
import { BadRequestException } from '@nestjs/common';

describe('SyllabusUseCase', () => {
  let useCase: SyllabusUseCase;

  const mockRepo = {
    getSummaryBySyllabus: jest.fn(),
    createDistribution: jest.fn(),
    findByCourseAndCycle: jest.fn(),
    createSyllabus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyllabusUseCase,
        { provide: I_SYLLABUS_REPOSITORY, useValue: mockRepo }
      ],
    }).compile();

    useCase = module.get<SyllabusUseCase>(SyllabusUseCase);
  });

  it('should throw BadRequestException if requested quantity exceeds 100', async () => {
    mockRepo.getSummaryBySyllabus.mockResolvedValue([
      { weekNumber: 1, requestedQuantity: 60 }
    ]);

    await expect(useCase.addDistribution('syl-1', {
      weekNumber: 1,
      topicId: 't-1',
      subtopicId: 'st-1',
      requestedQuantity: 50
    })).rejects.toThrow(BadRequestException);
  });

  it('should create distribution if under limit', async () => {
    mockRepo.getSummaryBySyllabus.mockResolvedValue([
      { weekNumber: 1, requestedQuantity: 40 }
    ]);
    mockRepo.createDistribution.mockResolvedValue({ id: 'new-dist' });

    const result = await useCase.addDistribution('syl-1', {
      weekNumber: 1,
      topicId: 't-1',
      subtopicId: 'st-1',
      requestedQuantity: 50
    });

    expect(result.id).toBe('new-dist');
  });
});
