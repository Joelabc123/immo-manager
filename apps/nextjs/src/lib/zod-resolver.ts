import type { z } from "zod";
import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZodSchema = z.ZodType<any>;

export function zodResolver<T extends FieldValues>(
  schema: ZodSchema,
): Resolver<T> {
  return async (values) => {
    const result = schema.safeParse(values);

    if (result.success) {
      return { values: result.data as T, errors: {} };
    }

    const fieldErrors: FieldErrors<T> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      if (path && !(path in fieldErrors)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fieldErrors as any)[path] = {
          type: "validation",
          message: issue.message,
        };
      }
    }

    return { values: {} as Record<string, never>, errors: fieldErrors };
  };
}
