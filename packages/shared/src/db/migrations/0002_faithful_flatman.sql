CREATE TABLE "email_email_labels" (
	"email_id" uuid NOT NULL,
	"label_id" uuid NOT NULL,
	CONSTRAINT "email_email_labels_email_id_label_id_pk" PRIMARY KEY("email_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "email_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"path" text NOT NULL,
	"type" text DEFAULT 'custom' NOT NULL,
	"total_messages" integer DEFAULT 0 NOT NULL,
	"unread_messages" integer DEFAULT 0 NOT NULL,
	"uid_validity" integer,
	"last_sync_uid" integer,
	"last_sync_at" timestamp,
	CONSTRAINT "email_folders_account_path_unq" UNIQUE("email_account_id","path")
);
--> statement-breakpoint
CREATE TABLE "email_labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"is_predefined" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_labels_user_name_unq" UNIQUE("user_id","name")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "default_email_account_id" uuid;--> statement-breakpoint
ALTER TABLE "email_accounts" ADD COLUMN "label" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_accounts" ADD COLUMN "sync_interval_minutes" integer DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE "email_accounts" ADD COLUMN "last_sync_at" timestamp;--> statement-breakpoint
ALTER TABLE "email_accounts" ADD COLUMN "sync_status" text DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_accounts" ADD COLUMN "sync_error" text;--> statement-breakpoint
ALTER TABLE "email_accounts" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "folder_id" uuid;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "html_body" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "text_body" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "snippet" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "uid" integer;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "flags" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "size" integer;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "has_attachments" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "email_email_labels" ADD CONSTRAINT "email_email_labels_email_id_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_email_labels" ADD CONSTRAINT "email_email_labels_label_id_email_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."email_labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_folders" ADD CONSTRAINT "email_folders_email_account_id_email_accounts_id_fk" FOREIGN KEY ("email_account_id") REFERENCES "public"."email_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_labels" ADD CONSTRAINT "email_labels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_email_labels_email_id_idx" ON "email_email_labels" USING btree ("email_id");--> statement-breakpoint
CREATE INDEX "email_email_labels_label_id_idx" ON "email_email_labels" USING btree ("label_id");--> statement-breakpoint
CREATE INDEX "email_folders_account_id_idx" ON "email_folders" USING btree ("email_account_id");--> statement-breakpoint
CREATE INDEX "email_labels_user_id_idx" ON "email_labels" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_folder_id_email_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."email_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "emails_folder_id_idx" ON "emails" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "emails_uid_idx" ON "emails" USING btree ("folder_id","uid");