import { MaterialRequest } from '../entities/material-request.entity';
import { MaterialRequestCourse } from '../entities/material-request-course.entity';
import { MaterialReviewQuestion } from '../entities/material-review-question.entity';
import { MaterialQuestionUsage } from '../entities/material-question-usage.entity';

export const I_MATERIALS_REPOSITORY = 'IMaterialsRepository';

export interface IMaterialsRepository {
  createRequest(request: Partial<MaterialRequest>): Promise<MaterialRequest>;
  getRequestById(id: string): Promise<MaterialRequest | null>;
  updateRequestStatus(id: string, status: string): Promise<void>;

  createCourses(
    courses: Partial<MaterialRequestCourse>[],
  ): Promise<MaterialRequestCourse[]>;
  updateCourse(
    courseId: string,
    data: Partial<MaterialRequestCourse>,
  ): Promise<void>;

  saveReviewQuestions(
    questions: Partial<MaterialReviewQuestion>[],
  ): Promise<void>;
  getReviewQuestions(requestId: string): Promise<MaterialReviewQuestion[]>;

  saveQuestionUsage(usages: Partial<MaterialQuestionUsage>[]): Promise<void>;
  getUsedQuestionsInCycle(cycleId: string, courseId: string): Promise<string[]>;
}
