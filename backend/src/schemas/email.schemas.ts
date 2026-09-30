import { z } from "zod";

const MAX_PAST_MS = 60 * 1000;
const MAX_FUTURE_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_SPAN_MS = 30 * 24 * 60 * 60 * 1000;

export const scheduleEmailsSchema = z
  .object({
    subject: z.string().trim().min(1).max(998),
    body: z.string().min(1).max(200_000),
    recipients: z
      .array(z.string().trim().toLowerCase().pipe(z.email()))
      .min(1)
      .max(10_000),
    startTime: z.iso.datetime({ offset: true }).transform((v) => new Date(v)),
    delaySeconds: z.number().int().min(0).max(3600),
    hourlyLimit: z.number().int().min(1).max(10_000),
    senderIds: z.array(z.uuid()).min(1).max(20).optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    const now = Date.now();
    const start = input.startTime.getTime();

    if (start < now - MAX_PAST_MS) {
      ctx.addIssue({
        code: "custom",
        path: ["startTime"],
        message: "startTime must not be more than 60 seconds in the past",
      });
    }

    if (start > now + MAX_FUTURE_MS) {
      ctx.addIssue({
        code: "custom",
        path: ["startTime"],
        message: "startTime must not be more than 1 year in the future",
      });
    }

    if ((input.recipients.length - 1) * input.delaySeconds * 1000 > MAX_SPAN_MS) {
      ctx.addIssue({
        code: "custom",
        path: ["delaySeconds"],
        message: "Schedule span must not exceed 30 days",
      });
    }
  });

export type ScheduleEmailsInput = z.infer<typeof scheduleEmailsSchema>;

export const emailIdParamSchema = z.object({
  id: z.uuid(),
});

export const listEmailsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListEmailsQuery = z.infer<typeof listEmailsQuerySchema>;

export const searchEmailsQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(["scheduled", "processing", "sent", "failed"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});
