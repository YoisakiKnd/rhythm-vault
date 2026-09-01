CREATE INDEX "scores_user_game_rating_idx" ON "scores" USING btree ("user_id","game","rating" DESC NULLS LAST);
