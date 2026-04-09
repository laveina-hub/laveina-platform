import { z } from "zod";

const userRoleEnum = z.enum(["admin", "pickup_point", "customer"]);

export const updateUserRoleSchema = z.object({
  role: userRoleEnum,
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const userListQuerySchema = z.object({
  search: z.string().optional(),
  role: userRoleEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;
