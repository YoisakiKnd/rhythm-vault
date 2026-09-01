ALTER TABLE "users" ADD COLUMN "profile_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "linked_accounts" ADD COLUMN "external_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "query_identities" ADD COLUMN "verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DROP INDEX IF EXISTS "scores_user_game_rating_idx";--> statement-breakpoint
CREATE INDEX "rating_snapshot_game_rating_idx" ON "rating_snapshots" USING btree ("game","rating" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "scores_user_game_updated_idx" ON "scores" USING btree ("user_id","game","updated_at" DESC);--> statement-breakpoint
CREATE INDEX "linked_accounts_external_id_idx" ON "linked_accounts" USING btree ("user_id") WHERE "external_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "api_keys_app_id_idx" ON "api_keys" USING btree ("app_id");
