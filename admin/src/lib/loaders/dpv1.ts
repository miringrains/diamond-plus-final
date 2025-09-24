interface Lesson {
  id: string
  title: string
  description?: string
  thumbnailUrl?: string
  videoUrl?: string
  duration?: number
  isStartHere?: boolean
  isNextUp?: boolean
  isCompleted?: boolean
  progress?: number
}

export async function getWelcomeLessons(): Promise<Lesson[]> {
  // Placeholder function for DPV1 welcome lessons
  return []
}
