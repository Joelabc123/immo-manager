import { z } from "zod";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_CATEGORIES,
} from "../types/tasks";

const statusValues = Object.values(TASK_STATUSES) as [string, ...string[]];
const priorityValues = Object.values(TASK_PRIORITIES) as [string, ...string[]];
const categoryValues = Object.values(TASK_CATEGORIES) as [string, ...string[]];

export const taskStatusSchema = z.enum(statusValues);
export const taskPrioritySchema = z.enum(priorityValues);
export const taskCategorySchema = z.enum(categoryValues);

export const createTaskInput = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(20000).nullable().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  category: taskCategorySchema.optional(),
  dueDate: z.string().date().nullable().optional(),
  tenantId: z.string().uuid().nullable().optional(),
  propertyId: z.string().uuid().nullable().optional(),
  rentalUnitId: z.string().uuid().nullable().optional(),
  sourceEmailId: z.string().uuid().nullable().optional(),
  assigneeUserId: z.string().uuid().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskInput>;

export const updateTaskInput = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(20000).nullable().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  category: taskCategorySchema.optional(),
  dueDate: z.string().date().nullable().optional(),
  tenantId: z.string().uuid().nullable().optional(),
  propertyId: z.string().uuid().nullable().optional(),
  rentalUnitId: z.string().uuid().nullable().optional(),
  assigneeUserId: z.string().uuid().optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskInput>;

export const updateTaskStatusInput = z.object({
  id: z.string().uuid(),
  status: taskStatusSchema,
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusInput>;

export const listTasksInput = z.object({
  statuses: z.array(taskStatusSchema).optional(),
  priorities: z.array(taskPrioritySchema).optional(),
  categories: z.array(taskCategorySchema).optional(),
  tenantId: z.string().uuid().nullable().optional(),
  propertyId: z.string().uuid().nullable().optional(),
  search: z.string().max(200).optional(),
  includeCompleted: z.boolean().optional(),
});

export type ListTasksInput = z.infer<typeof listTasksInput>;

export const taskIdInput = z.object({
  id: z.string().uuid(),
});

export type TaskIdInput = z.infer<typeof taskIdInput>;

export const taskCountsByEmailIdsInput = z.object({
  emailIds: z.array(z.string().uuid()).max(500),
});

export type TaskCountsByEmailIdsInput = z.infer<
  typeof taskCountsByEmailIdsInput
>;
