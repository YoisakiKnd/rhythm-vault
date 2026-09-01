ALTER TABLE "users" ADD COLUMN "bot_query_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "scope" varchar(16) DEFAULT 'self' NOT NULL;--> statement-breakpoint
ALTER TABLE "query_identities" ADD COLUMN "verify_code" varchar(16);--> statement-breakpoint
ALTER TABLE "query_identities" ADD COLUMN "verify_expires_at" timestamp with time zone;--> statement-breakpoint
DROP INDEX IF EXISTS "query_identity_platform_user_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "query_identity_platform_user_idx" ON "query_identities" USING btree ("platform","platform_user_id") WHERE "verified";--> statement-breakpoint
CREATE UNIQUE INDEX "query_identity_user_platform_idx" ON "query_identities" USING btree ("user_id","platform","platform_user_id");
