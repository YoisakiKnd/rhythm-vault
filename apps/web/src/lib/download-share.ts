async function waitForImages(root: HTMLElement): Promise<void> {
	const imgs = [...root.querySelectorAll('img')];
	await Promise.all(
		imgs.map((img) => {
			if (img.complete && img.naturalWidth > 0) return Promise.resolve();
			return img.decode().catch(() => undefined);
		})
	);
}

function blobToDownload(blob: Blob, filename: string): void {
	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = filename;
	a.click();
	URL.revokeObjectURL(a.href);
}

/**
 * html-to-image 吃不下 Tailwind v4 的 oklab / color-mix。
 * 直接截已排版节点（用 style.opacity=1 覆盖隐藏层），出 WebP，避免再克隆一遍、也不走 PNG。
 */
export async function downloadShareImage(
	el: HTMLElement,
	filename: string,
	opts?: { backgroundColor?: string }
): Promise<void> {
	const { toCanvas } = await import('html-to-image');
	await waitForImages(el);
	const canvas = await toCanvas(el, {
		pixelRatio: 1.5,
		cacheBust: false,
		skipFonts: true,
		backgroundColor: opts?.backgroundColor ?? '#171717',
		style: { opacity: '1', transform: 'none' }
	});
	const blob = await new Promise<Blob | null>((resolve) => {
		canvas.toBlob(resolve, 'image/webp', 0.84);
	});
	if (!blob) throw new Error('导出失败');
	blobToDownload(blob, filename);
}
