ALTER TABLE "scores" ADD COLUMN "source" varchar(16);--> statement-breakpoint
UPDATE "scores" SET "source" = CASE WHEN "game" = 'djmax' THEN 'varchive' ELSE 'divingfish' END;--> statement-breakpoint
ALTER TABLE "scores" ALTER COLUMN "source" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "scores" DROP CONSTRAINT "scores_user_id_game_chart_key_pk";--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_user_id_game_chart_key_source_pk" PRIMARY KEY("user_id","game","chart_key","source");--> statement-breakpoint
DROP INDEX IF EXISTS "scores_user_game_rating_idx";--> statement-breakpoint
CREATE INDEX "scores_user_game_source_rating_idx" ON "scores" USING btree ("user_id","game","source","rating" DESC NULLS LAST);
