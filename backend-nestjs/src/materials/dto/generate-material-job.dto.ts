export interface TenantInfo {
  tenant_id: string;
  commercial_name: string;
  logo_url: string;
}

export interface ExamArea {
  exam_area_id: string;
  name: string;
}

export interface SyllabusDistribution {
  topic_id: string;
  subtopic_id: string;
  quantity: number;
}

export interface NotificationInfo {
  websocket_connection_id?: string;
  admin_user_id: string;
}

export interface GenerateMaterialJobDto {
  job_id: string;
  tenant: TenantInfo;
  material_type: 'EXAMEN' | 'BALOTARIO' | 'PRACTICA';
  course_id: string;
  difficulty_level: string;
  exam_areas?: ExamArea[];
  syllabus_distribution: SyllabusDistribution[];
  notification: NotificationInfo;
  design_template_id?: string | null;
  material_request_id?: string;
  cycle_id?: string;
  week_number?: number;
  template_name?: string;
}
