import { MaterialRequest } from '../entities/material-request.entity';
import { MaterialRequestCourse } from '../entities/material-request-course.entity';
import { MaterialReviewQuestion } from '../entities/material-review-question.entity';

export const I_MATERIALS_REPOSITORY = 'IMaterialsRepository';

export interface IMaterialsRepository {
  createRequest(request: Partial<MaterialRequest>): Promise<MaterialRequest>;
  findRequestById(id: string): Promise<MaterialRequest | null>;
  updateRequestStatus(id: string, status: any): Promise<void>;
  
  createCourseRequest(courseRequest: Partial<MaterialRequestCourse>): Promise<MaterialRequestCourse>;
  findCourseRequest(requestId: string, courseId: string): Promise<MaterialRequestCourse | null>;
  findCourseRequestById(id: string): Promise<MaterialRequestCourse | null>;
  updateCourseStatus(id: string, status: any, downloadUrl?: string, warnings?: any): Promise<void>;
  
  createReviewQuestion(question: Partial<MaterialReviewQuestion>): Promise<MaterialReviewQuestion>;
  findQuestionsByRequest(requestId: string): Promise<MaterialReviewQuestion[]>;
  updateReviewQuestionStatus(id: string, status: any, questionId?: string): Promise<void>;
}
