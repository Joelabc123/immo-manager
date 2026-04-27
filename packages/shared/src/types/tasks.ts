export const TASK_STATUSES = {
  new: "new",
  in_progress: "in_progress",
  done: "done",
  cancelled: "cancelled",
} as const;

export type TaskStatus = (typeof TASK_STATUSES)[keyof typeof TASK_STATUSES];

export const TASK_PRIORITIES = {
  low: "low",
  medium: "medium",
  high: "high",
} as const;

export type TaskPriority =
  (typeof TASK_PRIORITIES)[keyof typeof TASK_PRIORITIES];

export const TASK_CATEGORIES = {
  maintenance: "maintenance",
  complaint: "complaint",
  request: "request",
  other: "other",
} as const;

export type TaskCategory =
  (typeof TASK_CATEGORIES)[keyof typeof TASK_CATEGORIES];

export const OPEN_TASK_STATUSES = [
  TASK_STATUSES.new,
  TASK_STATUSES.in_progress,
] as const;
