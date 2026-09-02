CREATE TABLE "developer_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(64) NOT NULL,
	"purpose" text NOT NULL,
	"contact" varchar(128),
	"homepage" varchar(256),
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"review_note" text,
	"reviewed_by" varchar(32),
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "developer_applications" ADD CONSTRAINT "developer_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "developer_applications_user_idx" ON "developer_applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "developer_applications_status_idx" ON "developer_applications" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "developer_applications_one_pending_idx" ON "developer_applications" USING btree ("user_id") WHERE "status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "developer_applications_one_approved_idx" ON "developer_applications" USING btree ("user_id") WHERE "status" = 'approved';
