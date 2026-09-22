ALTER TABLE "linked_accounts" ADD COLUMN "last_sync_at" jsonb DEFAULT '{}'::jsonb NOT NULL;
