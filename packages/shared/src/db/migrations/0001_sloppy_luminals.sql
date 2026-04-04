ALTER TABLE "documents" ADD COLUMN "email_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "source_filename" text;--> statement-breakpoint
ALTER TABLE "share_links" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "share_links" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_email_id_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documents_email_id_idx" ON "documents" USING btree ("email_id");