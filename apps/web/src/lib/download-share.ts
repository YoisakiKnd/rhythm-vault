async function waitForImages(root: HTMLElement): Promise<void> {
	const imgs = [...root.querySelectorAll('img')];
	await Promise.all(
		imgs.map((img) => {
			if (img.complete && img.naturalWidth > 0) return Promise.resolve();
			return img.decode().catch(() => undefined);
		})
	);
}

/**
 * html-to-image 吃不下 Tailwind v4 的 oklab / color-mix，离屏节点也经常整图涂黑。
 * 克隆到视口内极低透明度再截，分享图固定 2x、宽边约 960px。
 */
export async function downloadSharePng(el: HTMLElement, filename: string): Promise<void> {
	const { toPng } = await import('html-to-image');
	const host = document.createElement('div');
	host.setAttribute('data-share-capture', '');
	host.style.cssText =
		'position:fixed;left:0;top:0;z-index:2147483646;pointer-events:none;opacity:0.01;';
	const clone = el.cloneNode(true) as HTMLElement;
	clone.style.position = 'static';
	clone.style.left = 'auto';
	clone.style.top = 'auto';
	clone.style.transform = 'none';
	host.appendChild(clone);
	document.body.appendChild(host);
	try {
		await waitForImages(clone);
		const dataUrl = await toPng(clone, {
			pixelRatio: 2,
			cacheBust: true,
			backgroundColor: '#171717',
			skipFonts: true
		});
		const a = document.createElement('a');
		a.href = dataUrl;
		a.download = filename;
		a.click();
	} finally {
		host.remove();
	}
}
