/**
 * Tipos compartidos para el módulo de Generación de Balotario PDF.
 * Basados en los contratos de `data-model.md` y `ws-notification.md`.
 */

// --- Enums de Estado ---

/** Estados posibles de un MaterialRequest en la BD */
export enum MaterialRequestStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  CURATION_REQUIRED = 'CURATION_REQUIRED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/** Estados de curaduría individual de una pregunta */
export enum CurationQuestionStatus {
  MISSING = 'MISSING',
  GENERATED = 'GENERATED',
  AUTO_COMPLETED = 'AUTO_COMPLETED',
  MANUAL_REMOVED = 'MANUAL_REMOVED',
}

// --- Interfaces de Datos ---

export interface MaterialRequest {
  id: string;
  tenantId: string;
  materialType: 'EXAMEN' | 'BALOTARIO';
  courseId: string;
  status: MaterialRequestStatus;
  downloadUrl?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurationQuestion {
  questionId: string;
  jobId: string;
  content: string;
  options: { key: string; value: string }[];
  status: CurationQuestionStatus;
}

// --- WebSocket Event Payloads ---

export interface WsCompletedPayload {
  event: 'material.generation.completed';
  data: {
    job_id: string;
    material_type: 'EXAMEN' | 'BALOTARIO';
    status: 'success';
    download_url: string;
    expires_in: number;
  };
}

export interface WsFailedPayload {
  event: 'material.generation.failed';
  data: {
    job_id: string;
    status: 'error';
    error_message: string;
  };
}

export type WsNotificationPayload = WsCompletedPayload | WsFailedPayload;

// --- API Request/Response DTOs ---

export interface GenerateMaterialRequest {
  material_type: 'EXAMEN' | 'BALOTARIO';
  course_id: string;
  difficulty_level: string;
  exam_areas?: string[];
}

export interface GenerateMaterialResponse {
  status: 'processing';
  job_id: string;
  message: string;
}
