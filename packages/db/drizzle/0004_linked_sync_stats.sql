ALTER TABLE "linked_accounts" ADD COLUMN "sync_stats" jsonb DEFAULT '{}'::jsonb NOT NULL;
