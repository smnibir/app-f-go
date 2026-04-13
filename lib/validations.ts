import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "One uppercase letter")
  .regex(/[0-9]/, "One number")
  .regex(/[^A-Za-z0-9]/, "One special character");

export const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const timelineAssetSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
  type: z.enum(["IMAGE", "VIDEO", "AUDIO", "PDF"]),
  filename: z.string(),
  size: z.number().optional(),
});

export const timelineEntryCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  entryDate: z.string().datetime(),
  publishImmediately: z.boolean(),
  publishAt: z.string().datetime().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED"]).optional(),
  assets: z.array(timelineAssetSchema).optional(),
});

export const timelineEntryPatchSchema = timelineEntryCreateSchema.partial().extend({
  removedAssetIds: z.array(z.string()).optional(),
  newAssets: z.array(timelineAssetSchema).optional(),
});

export const changeEmailSchema = z.object({
  newEmail: z.string().email(),
  currentPassword: z.string().min(1),
});

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const adminUserCreateSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(["SUPER_ADMIN", "ADMIN", "USER"]),
    sendWelcomeEmail: z.boolean().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

/** Admin updates to an existing user (no password here). */
export const adminUserPatchSchema = z
  .object({
    /** Cleared name is stored as null. */
    name: z.string().max(200).optional(),
    role: z.enum(["SUPER_ADMIN", "ADMIN", "USER"]).optional(),
    status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  })
  .refine((d) => d.name !== undefined || d.role !== undefined || d.status !== undefined, {
    message: "No changes",
  });

export const supAdminSettingsPatchSchema = z.object({
  app_name: z.string().min(1).max(200).optional(),
  from_email: z.string().email().optional(),
  /** Empty or omitted = leave unchanged. Non-empty = replace stored key. */
  sendgrid_api_key: z.string().optional(),
  logo_url: z.string().optional(),
  logo_public_id: z.string().optional(),
  cloudinary_cloud_name: z.string().max(200).optional(),
  cloudinary_api_key: z.string().optional(),
  cloudinary_api_secret: z.string().optional(),
});

export const emailTemplatePatchSchema = z.object({
  key: z.string().min(1),
  subject: z.string().min(1).max(500),
  htmlBody: z.string().min(1),
  variables: z.string().max(4000).optional(),
});
