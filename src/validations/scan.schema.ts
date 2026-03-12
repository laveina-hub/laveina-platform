import { z } from "zod";

export const scanQrSchema = z.object({
  tracking_id: z.string().min(1, "Tracking ID is required"),
  pickup_point_id: z.string().uuid("Invalid pickup point"),
});

export type ScanQrInput = z.infer<typeof scanQrSchema>;
