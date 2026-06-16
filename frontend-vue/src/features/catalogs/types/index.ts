// =====================================================
// Feature: Catalogs - Types
// =====================================================

export interface CatalogTopic {
  id: string
  coreName: string
  localAlias: string | null
  isActive: boolean
  courseId: string
  subtopics?: CatalogSubtopic[]
}

export interface CatalogSubtopic {
  id: string
  coreName: string
  localAlias: string | null
  isActive: boolean
  topicId: string
}

export interface CatalogCourse {
  id: string
  coreName: string
  localAlias: string | null
  isActive: boolean
  topics?: CatalogTopic[]
}

export interface TopicPatch {
  localAlias?: string | null
  isActive?: boolean
}
