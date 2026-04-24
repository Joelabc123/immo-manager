CREATE TABLE "verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"type" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "verification_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_token_unique";--> statement-breakpoint
DROP INDEX "sessions_token_idx";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "refresh_token_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "family_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "refresh_token_expires_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "last_active_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "verification_tokens_token_hash_idx" ON "verification_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "verification_tokens_user_id_idx" ON "verification_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_refresh_token_hash_idx" ON "sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "sessions_family_id_idx" ON "sessions" USING btree ("family_id");--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "token";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "expires_at";--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_refresh_token_hash_unique" UNIQUE("refresh_token_hash");