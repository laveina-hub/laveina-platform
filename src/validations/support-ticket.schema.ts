import { z } from "zod";

export const createSupportTicketSchema = z.object({
  subject: z.string().trim().min(3, "validation.subjectMin").max(140, "validation.subjectMax"),
  message: z.string().trim().min(10, "validation.messageMin").max(4000, "validation.messageMax"),
  shipment_id: z.string().uuid().optional().nullable(),
});

export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;

export const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** Admin-side PATCH — either updates the status, posts a response, or both.
 *  At least one field must be present so we don't waste a DB write. */
export const adminSupportTicketUpdateSchema = z
  .object({
    status: z.enum(TICKET_STATUSES).optional(),
    admin_response: z
      .string()
      .trim()
      .min(1, "validation.responseMin")
      .max(4000, "validation.responseMax")
      .optional(),
  })
  .refine((input) => input.status !== undefined || input.admin_response !== undefined, {
    message: "validation.noUpdateFields",
  });

export type AdminSupportTicketUpdateInput = z.infer<typeof adminSupportTicketUpdateSchema>;
