CREATE TABLE "dashboard_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"layout" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dashboard_presets" ADD CONSTRAINT "dashboard_presets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_presets_user_name_idx" ON "dashboard_presets" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "dashboard_presets_user_idx" ON "dashboard_presets" USING btree ("user_id");--> statement-breakpoint
INSERT INTO "dashboard_presets" ("user_id", "name", "is_default", "layout")
SELECT "id", 'My Dashboard', true, "dashboard_layout"
FROM "users"
WHERE "dashboard_layout" IS NOT NULL;