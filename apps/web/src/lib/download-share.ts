export async function downloadSharePng(el: HTMLElement, filename: string): Promise<void> {
	const { toPng } = await import('html-to-image');
	const dataUrl = await toPng(el, {
		pixelRatio: 2,
		cacheBust: true,
		backgroundColor: '#171717'
	});
	const a = document.createElement('a');
	a.href = dataUrl;
	a.download = filename;
	a.click();
}
