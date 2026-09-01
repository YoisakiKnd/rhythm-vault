import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
	scryptSync,
	timingSafeEqual
} from 'node:crypto';

export function sha256Hex(input: string): string {
	return createHash('sha256').update(input).digest('hex');
}

/** 恒定时间字符串比较（长度不同时直接 false，避免泄露长度以外的信息） */
export function safeEqual(a: string, b: string): boolean {
	const left = Buffer.from(a);
	const right = Buffer.from(b);
	if (left.length !== right.length) return false;
	return timingSafeEqual(left, right);
}

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
	const salt = randomBytes(16);
	const hash = scryptSync(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
	return `scrypt:v1:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	const parts = stored.split(':');
	if (parts[0] !== 'scrypt' || parts.length < 3) return false;
	try {
		if (parts[1] === 'v1' && parts.length === 7) {
			const n = Number(parts[2]);
			const r = Number(parts[3]);
			const p = Number(parts[4]);
			const saltHex = parts[5];
			const hashHex = parts[6];
			if (!saltHex || !hashHex || !Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) {
				return false;
			}
			const expected = Buffer.from(hashHex, 'hex');
			const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, {
				N: n,
				r,
				p
			});
			return timingSafeEqual(actual, expected);
		}
		// 兼容旧格式 scrypt:salt:hash（Node 默认参数）
		const saltHex = parts[1];
		const hashHex = parts[2];
		if (!saltHex || !hashHex) return false;
		const expected = Buffer.from(hashHex, 'hex');
		const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
		return timingSafeEqual(actual, expected);
	} catch {
		return false;
	}
}

/**
 * 第三方 token 静态加密：AES-256-GCM，密钥由 ENCRYPTION_KEY 派生。
 * 输出格式 v1.<iv>.<authTag>.<cipher>（hex）。
 */
export function encryptSecret(plain: string, keyMaterial: string): string {
	const key = createHash('sha256').update(keyMaterial).digest();
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', key, iv);
	const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
	return ['v1', iv.toString('hex'), cipher.getAuthTag().toString('hex'), ct.toString('hex')].join('.');
}

export function decryptSecret(enc: string, keyMaterial: string): string {
	const [version, ivHex, tagHex, ctHex] = enc.split('.');
	if (version !== 'v1' || !ivHex || !tagHex || !ctHex) throw new Error('加密格式无效');
	const key = createHash('sha256').update(keyMaterial).digest();
	const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
	decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
	return Buffer.concat([decipher.update(Buffer.from(ctHex, 'hex')), decipher.final()]).toString('utf8');
}
