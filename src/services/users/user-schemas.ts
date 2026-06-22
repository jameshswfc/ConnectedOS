import { PermissionLevel } from "@prisma/client";
import { z } from "zod";

const emptyToUndefined = (value: unknown) => value === "" || value === null ? undefined : value;

export const userCreateSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  roleId: z.string().uuid(),
  permissionLevel: z.nativeEnum(PermissionLevel),
  isActive: z.boolean().default(true),
  password: z.string(),
  confirmPassword: z.string()
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
  roleId: z.string().uuid().optional(),
  permissionLevel: z.nativeEnum(PermissionLevel).optional(),
  isActive: z.boolean().optional()
});

export const userResetPasswordSchema = z.object({
  password: z.string(),
  confirmPassword: z.string(),
  mustChangePassword: z.boolean().default(true)
});

export const meUpdateSchema = z.object({
  name: z.string().trim().min(1)
});

export const changePasswordSchema = z.object({
  currentPassword: z.string(),
  password: z.string(),
  confirmPassword: z.string()
});

export const userSearchSchema = z.object({
  includeInactive: z.preprocess(emptyToUndefined, z.coerce.boolean().optional())
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type UserResetPasswordInput = z.infer<typeof userResetPasswordSchema>;
export type MeUpdateInput = z.infer<typeof meUpdateSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
