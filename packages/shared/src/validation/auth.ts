import { z } from "zod";

/**
 * Password must be at least 10 characters and contain:
 * - 1 uppercase letter
 * - 1 digit
 * - 1 special character
 */
export const PASSWORD_REGEX =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}$/;

export const passwordSchema = z
  .string()
  .min(10)
  .max(128)
  .regex(PASSWORD_REGEX, {
    message:
      "Password must contain at least 1 uppercase letter, 1 number, and 1 special character",
  });

export const registerInput = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  password: passwordSchema,
});

export const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const verifyEmailInput = z.object({
  token: z.string().min(1),
});

export const forgotPasswordInput = z.object({
  email: z.string().email(),
});

export const resetPasswordInput = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const resendVerificationInput = z.object({
  email: z.string().email(),
});

export type RegisterInput = z.infer<typeof registerInput>;
export type LoginInput = z.infer<typeof loginInput>;
export type VerifyEmailInput = z.infer<typeof verifyEmailInput>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInput>;
export type ResetPasswordInput = z.infer<typeof resetPasswordInput>;
export type ResendVerificationInput = z.infer<typeof resendVerificationInput>;
