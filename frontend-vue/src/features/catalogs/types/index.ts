export interface CatalogSubtopic {
  id: string
  name: string
}

export interface CatalogTopic {
  id: string
  name: string
  isActive: boolean
  subtopics: CatalogSubtopic[]
}

export interface CatalogCourse {
  id: string
  name: string
  topicsCount?: number
  activeTopicsCount?: number
  topics: CatalogTopic[]
}

export interface TopicVisibilityPayload {
  isActive: boolean
}
