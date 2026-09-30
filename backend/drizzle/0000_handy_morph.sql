CREATE TYPE "public"."email_status" AS ENUM('scheduled', 'processing', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"delay_seconds" integer NOT NULL,
	"hourly_limit" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_delay_nonneg" CHECK ("campaigns"."delay_seconds" >= 0),
	CONSTRAINT "campaigns_hourly_limit_pos" CHECK ("campaigns"."hourly_limit" > 0)
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"sender_id" uuid,
	"to_email" text NOT NULL,
	"status" "email_status" DEFAULT 'scheduled' NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"reschedule_count" integer DEFAULT 0 NOT NULL,
	"claimed_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"message_id" text,
	"preview_url" text,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "emails_attempts_nonneg" CHECK ("emails"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "senders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"from_email" text NOT NULL,
	"smtp_host" text NOT NULL,
	"smtp_port" integer NOT NULL,
	"smtp_user" text NOT NULL,
	"smtp_pass" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slack_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"team_id" text,
	"team_name" text,
	"channel" text,
	"webhook_url" text NOT NULL,
	"access_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "slack_connections_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_sub" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_google_sub_unique" UNIQUE("google_sub"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_sender_id_senders_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."senders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "senders" ADD CONSTRAINT "senders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_connections" ADD CONSTRAINT "slack_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaigns_user_created_idx" ON "campaigns" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "emails_campaign_recipient_uq" ON "emails" USING btree ("campaign_id","to_email");--> statement-breakpoint
CREATE INDEX "emails_status_scheduled_at_idx" ON "emails" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "senders_user_from_email_uq" ON "senders" USING btree ("user_id","from_email");