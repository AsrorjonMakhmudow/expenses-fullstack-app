CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_sha256" char(64) NOT NULL,
	"parser_id" text NOT NULL,
	"parsed_count" integer NOT NULL,
	"imported_count" integer NOT NULL,
	"duplicate_count" integer NOT NULL,
	"summary" jsonb NOT NULL,
	"issues" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "import_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_batches_user_id_created_at_idx" ON "import_batches" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_import_batch_id_idx" ON "expenses" USING btree ("import_batch_id");