import { z } from "zod";

export const createSenderSchema = z
  .object({
    fromEmail: z.string().trim().toLowerCase().pipe(z.email()),
    smtpHost: z.string().trim().min(1).max(255),
    smtpPort: z.number().int().min(1).max(65535),
    smtpUser: z.string().trim().min(1).max(255),
    smtpPass: z.string().min(1).max(1000),
  })
  .strict();

export type CreateSenderInput = z.infer<typeof createSenderSchema>;

export const senderIdParamSchema = z.object({
  id: z.uuid(),
});
