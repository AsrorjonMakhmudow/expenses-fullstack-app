CREATE TYPE "public"."expense_source" AS ENUM('manual', 'telegram_import', 'plain_text_import', 'bot');--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"spent_on" date NOT NULL,
	"amount" bigint NOT NULL,
	"currency" char(3) DEFAULT 'UZS' NOT NULL,
	"description" text NOT NULL,
	"source" "expense_source" DEFAULT 'manual' NOT NULL,
	"raw_line" text,
	"dedupe_hash" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_amount_positive" CHECK ("expenses"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_user_id_spent_on_idx" ON "expenses" USING btree ("user_id","spent_on");--> statement-breakpoint
CREATE UNIQUE INDEX "expenses_user_id_dedupe_hash_key" ON "expenses" USING btree ("user_id","dedupe_hash");