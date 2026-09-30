import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url(),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  REDIS_URL: z.url(),

  SMTP_HOST: z.string().min(1).default("smtp.ethereal.email"),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  MAIL_DRY_RUN: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  ELASTICSEARCH_URL: z.url().default("http://localhost:9200"),
  ELASTICSEARCH_INDEX: z.string().min(1).default("emails"),

  SLACK_CLIENT_ID: z.string().min(1).optional(),
  SLACK_CLIENT_SECRET: z.string().min(1).optional(),
  SLACK_REDIRECT_URI: z
    .url()
    .default("http://localhost:4000/api/slack/callback"),
  SLACK_API_URL: z.url().default("https://slack.com"),

  ADMIN_EMAILS: z.string().optional(),

  CONCURRENCY: z.coerce.number().int().min(1).max(100).default(5),
  MIN_SEND_DELAY_MS: z.coerce.number().int().min(0).default(2000),
  EMAILS_PER_HOUR: z.coerce.number().int().min(1).default(100),
  RATE_WINDOW_MS: z.coerce.number().int().min(1000).default(3_600_000),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z
    .url()
    .default("http://localhost:4000/api/auth/google/callback"),
  JWT_SECRET: z.string().min(32),
  SENDER_ENCRYPTION_KEY: z.string().min(32).optional(),
  AUTH_SUCCESS_REDIRECT: z.url().default("http://localhost:4000/api/me"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
