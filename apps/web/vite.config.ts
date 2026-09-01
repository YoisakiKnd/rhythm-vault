import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Vite 不读上级目录的 .env：开发时手动把仓库根目录的 .env 注入 process.env
// （生产环境直接用真实环境变量，不经过这里）
try {
	for (const line of readFileSync(new URL('../../.env', import.meta.url), 'utf8').split('\n')) {
		const m = line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/);
		if (m && process.env[m[1]] === undefined) {
			process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
		}
	}
} catch {
	// .env 不存在时忽略（未配置数据库等功能会在调用时报出明确错误）
}

export default defineConfig({
	server: {
		port: 5173,
		strictPort: true,
		host: 'localhost'
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// 自部署服务器使用 adapter-node，构建产物用 `node build` 启动
			adapter: adapter(),

			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self', 'https://challenges.cloudflare.com'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:'],
					'font-src': ['self'],
					'connect-src': ['self', 'https://challenges.cloudflare.com'],
					'frame-src': ['https://challenges.cloudflare.com'],
					'frame-ancestors': ['none'],
					'base-uri': ['self'],
					'form-action': ['self']
				}
			}
		})
	]
});
