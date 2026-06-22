from pydantic import BaseModel, Field
from typing import List, Optional

class TenantMetadataSchema(BaseModel):
    tenant_id: str
    commercial_name: str
    logo_url: str

class ExamAreaSchema(BaseModel):
    exam_area_id: str
    name: str

class SyllabusDistributionItemSchema(BaseModel):
    topic_id: str
    subtopic_id: str
    weight: int

class NotificationSchema(BaseModel):
    admin_user_id: str
    websocket_connection_id: Optional[str] = None

class GenerateMaterialJobPayload(BaseModel):
    job_id: str
    tenant: TenantMetadataSchema
    material_type: str
    course_id: str
    difficulty_level: str
    requires_curation: Optional[bool] = False
    exam_areas: Optional[List[ExamAreaSchema]] = None
    syllabus_distribution: List[SyllabusDistributionItemSchema]
    notification: NotificationSchema
