import { z } from "zod";
import { isValidAmityEmail } from "./services/authService";

const amityEmailRule = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .refine(isValidAmityEmail, { message: "Must be a valid Amity email" });

const loginEmailRule = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .email("Enter a valid email");

const loginSchema = z.object({
  email: loginEmailRule,
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters"),
  email: amityEmailRule,
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
      "Must include uppercase, lowercase, and a number",
    ),
});

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Must be exactly 6 digits"),
});

const forgotPasswordSchema = z.object({
  email: loginEmailRule,
});

const resetOTPSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Must be exactly 6 digits"),
});

const newPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
        "Must include uppercase, lowercase, and a number",
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const schemaMap = {
  login: loginSchema,
  register: registerSchema,
  otp: otpSchema,
  "forgot-password": forgotPasswordSchema,
  "reset-otp": resetOTPSchema,
  "new-password": newPasswordSchema,
};
