CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"property_id" uuid,
	"rental_unit_id" uuid,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"amount" integer NOT NULL,
	"remaining_amount" integer NOT NULL,
	"due_date" date NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dunning_record_claims" (
	"dunning_record_id" uuid NOT NULL,
	"claim_id" uuid NOT NULL,
	"amount_included" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dunning_record_claims_dunning_record_id_claim_id_pk" PRIMARY KEY("dunning_record_id","claim_id")
);
--> statement-breakpoint
CREATE TABLE "dunning_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "dunning_level_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"level" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"days_after_due" integer DEFAULT 7 NOT NULL,
	"fee_amount" integer DEFAULT 0 NOT NULL,
	"tone" text DEFAULT 'formal' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dunning_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"default_federal_state" text DEFAULT 'NW' NOT NULL,
	"late_payment_threshold_count" integer DEFAULT 2 NOT NULL,
	"late_payment_window_months" integer DEFAULT 12 NOT NULL,
	"automation_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dunning_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"level" text,
	"locale" text DEFAULT 'de' NOT NULL,
	"subject_template" text NOT NULL,
	"body_template" text NOT NULL,
	"tone" text DEFAULT 'formal' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dunning_records" ADD COLUMN "document_type" text DEFAULT 'rent' NOT NULL;--> statement-breakpoint
ALTER TABLE "dunning_records" ADD COLUMN "status" text DEFAULT 'created' NOT NULL;--> statement-breakpoint
ALTER TABLE "dunning_records" ADD COLUMN "payment_deadline" date;--> statement-breakpoint
ALTER TABLE "dunning_records" ADD COLUMN "subject_snapshot" text;--> statement-breakpoint
ALTER TABLE "dunning_records" ADD COLUMN "body_snapshot" text;--> statement-breakpoint
ALTER TABLE "dunning_records" ADD COLUMN "fee_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "dunning_records" ADD COLUMN "total_amount" integer;--> statement-breakpoint
ALTER TABLE "dunning_records" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "dunning_records" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "dunning_records" ADD COLUMN "resolved_at" timestamp;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_rental_unit_id_rental_units_id_fk" FOREIGN KEY ("rental_unit_id") REFERENCES "public"."rental_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dunning_record_claims" ADD CONSTRAINT "dunning_record_claims_dunning_record_id_dunning_records_id_fk" FOREIGN KEY ("dunning_record_id") REFERENCES "public"."dunning_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dunning_record_claims" ADD CONSTRAINT "dunning_record_claims_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dunning_alerts" ADD CONSTRAINT "dunning_alerts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dunning_level_configs" ADD CONSTRAINT "dunning_level_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dunning_settings" ADD CONSTRAINT "dunning_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dunning_templates" ADD CONSTRAINT "dunning_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claims_tenant_id_idx" ON "claims" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "claims_property_id_idx" ON "claims" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "claims_rental_unit_id_idx" ON "claims" USING btree ("rental_unit_id");--> statement-breakpoint
CREATE INDEX "claims_status_idx" ON "claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dunning_alerts_tenant_id_idx" ON "dunning_alerts" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dunning_level_configs_user_type_level_idx" ON "dunning_level_configs" USING btree ("user_id","document_type","level");--> statement-breakpoint
CREATE INDEX "dunning_level_configs_user_id_idx" ON "dunning_level_configs" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dunning_settings_user_id_idx" ON "dunning_settings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dunning_templates_user_type_level_locale_idx" ON "dunning_templates" USING btree ("user_id","document_type","level","locale");--> statement-breakpoint
CREATE INDEX "dunning_templates_user_id_idx" ON "dunning_templates" USING btree ("user_id");