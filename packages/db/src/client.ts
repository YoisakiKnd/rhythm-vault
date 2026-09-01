import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

function sslOption(): boolean | undefined {
	const raw = process.env.DATABASE_SSL;
	if (raw === '1' || raw === 'true' || raw === 'require') return true;
	return undefined;
}

export function createDb(url: string) {
	const max = Number(process.env.DATABASE_POOL_MAX ?? '5') || 5;
	const client = postgres(url, {
		max,
		idle_timeout: Number(process.env.DATABASE_IDLE_TIMEOUT ?? '20') || 20,
		connect_timeout: Number(process.env.DATABASE_CONNECT_TIMEOUT ?? '10') || 10,
		ssl: sslOption()
	});
	return drizzle(client, { schema });
}

export type DB = ReturnType<typeof createDb>;

let _db: DB | null = null;

/** 惰性单例：首次访问时才要求 DATABASE_URL */
export function getDb(): DB {
	if (!_db) {
		const url = process.env.DATABASE_URL;
		if (!url) throw new Error('缺少 DATABASE_URL 环境变量（复制 .env.example 为 .env 并配置）');
		_db = createDb(url);
	}
	return _db;
}
