import { z } from "zod";

// A11 (client answer 2026-04-21):
//   - Comment required for ratings ≤ 3 stars (min 20 characters).
//   - Comment optional for 4–5 stars (up to 1000 chars).
// The same schema is used by the POST + PATCH routes; absent stars is only
// valid on PATCH (partial edit) and handled separately below.

const starsField = z.number().int().min(1).max(5);
const commentField = z.string().trim().max(1000);

/** POST /api/ratings — create a rating after delivery. */
export const createRatingSchema = z
  .object({
    shipment_id: z.string().uuid(),
    tracking_id: z.string().min(3),
    stars: starsField,
    comment: commentField.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.stars <= 3) {
      const comment = data.comment?.trim() ?? "";
      if (comment.length < 20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["comment"],
          message: "validation.ratingCommentRequired",
        });
      }
    }
  });

/** PATCH /api/ratings/[id] — edit within 7 days. */
export const updateRatingSchema = z
  .object({
    stars: starsField,
    comment: commentField.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.stars <= 3) {
      const comment = data.comment?.trim() ?? "";
      if (comment.length < 20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["comment"],
          message: "validation.ratingCommentRequired",
        });
      }
    }
  });

export type CreateRatingInput = z.infer<typeof createRatingSchema>;
export type UpdateRatingInput = z.infer<typeof updateRatingSchema>;

export const MIN_RATING_COMMENT_CHARS = 20;
export const LOW_STAR_THRESHOLD = 3;
export const RATING_EDIT_WINDOW_DAYS = 7;

export const RATING_STATUSES = ["pending", "approved", "rejected"] as const;
export type RatingStatus = (typeof RATING_STATUSES)[number];

/** PATCH /api/admin/ratings/[id] — admin moderation. Flips status between
 *  approved/rejected/pending. Writes nothing else. */
export const adminRatingStatusSchema = z.object({
  status: z.enum(RATING_STATUSES),
});

export type AdminRatingStatusInput = z.infer<typeof adminRatingStatusSchema>;
