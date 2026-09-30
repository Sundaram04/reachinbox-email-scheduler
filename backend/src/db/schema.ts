import { sql } from "drizzle-orm";

import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// --------------------------------------------------
// Helpers
// --------------------------------------------------

export const emailStatus = pgEnum("email_status", [
  "scheduled",
  "processing",
  "sent",
  "failed",
]);

const createdAt = () =>
  timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow();

const updatedAt = () =>
  timestamp("updated_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// --------------------------------------------------
// Users
// --------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  googleSub: text("google_sub").notNull().unique(),

  email: text("email").notNull().unique(),

  name: text("name"),

  avatarUrl: text("avatar_url"),

  createdAt: createdAt(),

  updatedAt: updatedAt(),
});

// --------------------------------------------------
// Senders
// --------------------------------------------------

export const senders = pgTable(
  "senders",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    fromEmail: text("from_email").notNull(),

    smtpHost: text("smtp_host").notNull(),

    smtpPort: integer("smtp_port").notNull(),

    smtpUser: text("smtp_user").notNull(),

    smtpPass: text("smtp_pass").notNull(),

    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("senders_user_from_email_uq").on(t.userId, t.fromEmail)],
);

// --------------------------------------------------
// Campaigns
// --------------------------------------------------

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    subject: text("subject").notNull(),

    body: text("body").notNull(),

    startTime: timestamp("start_time", {
      withTimezone: true,
    }).notNull(),

    delaySeconds: integer("delay_seconds").notNull(),

    hourlyLimit: integer("hourly_limit").notNull(),

    createdAt: createdAt(),
  },
  (t) => [
    index("campaigns_user_created_idx").on(t.userId, t.createdAt),

    check("campaigns_delay_nonneg", sql`${t.delaySeconds} >= 0`),

    check("campaigns_hourly_limit_pos", sql`${t.hourlyLimit} > 0`),
  ],
);

// --------------------------------------------------
// Emails
// --------------------------------------------------

export const emails = pgTable(
  "emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, {
        onDelete: "cascade",
      }),

    senderId: uuid("sender_id").references(() => senders.id, {
      onDelete: "restrict",
    }),

    toEmail: text("to_email").notNull(),

    status: emailStatus("status").notNull().default("scheduled"),

    scheduledAt: timestamp("scheduled_at", {
      withTimezone: true,
    }).notNull(),

    attempts: integer("attempts").notNull().default(0),

    rescheduleCount: integer("reschedule_count").notNull().default(0),

    claimedAt: timestamp("claimed_at", {
      withTimezone: true,
    }),

    sentAt: timestamp("sent_at", {
      withTimezone: true,
    }),

    messageId: text("message_id"),

    previewUrl: text("preview_url"),

    lastError: text("last_error"),

    createdAt: createdAt(),

    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("emails_campaign_recipient_uq").on(t.campaignId, t.toEmail),

    index("emails_status_scheduled_at_idx").on(t.status, t.scheduledAt),

    check("emails_attempts_nonneg", sql`${t.attempts} >= 0`),
  ],
);

// --------------------------------------------------
// Slack Connections
// --------------------------------------------------

export const slackConnections = pgTable("slack_connections", {
  id: uuid("id").primaryKey().defaultRandom(),

  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, {
      onDelete: "cascade",
    }),

  teamId: text("team_id"),

  teamName: text("team_name"),

  channel: text("channel"),

  webhookUrl: text("webhook_url").notNull(),

  accessToken: text("access_token"),

  createdAt: createdAt(),

  updatedAt: updatedAt(),

  revokedAt: timestamp("revoked_at", {
    withTimezone: true,
  }),
});

// --------------------------------------------------
// TypeScript Types
// --------------------------------------------------

export type User = typeof users.$inferSelect;

export type Sender = typeof senders.$inferSelect;

export type Campaign = typeof campaigns.$inferSelect;

export type Email = typeof emails.$inferSelect;

export type NewEmail = typeof emails.$inferInsert;

export type EmailStatus = (typeof emailStatus.enumValues)[number];
