import { describe, expect, test } from 'bun:test';
import { AuthError } from './auth';
import { parseDjmaxManualForm } from './djmax-manual';

describe('parseDjmaxManualForm', () => {
	test('解析合法表单', () => {
		const fd = new FormData();
		fd.set('songId', '42');
		fd.set('button', '4');
		fd.set('pattern', 'sc');
		fd.set('score', '98.5');
		fd.set('maxCombo', '1');
		expect(parseDjmaxManualForm(fd)).toEqual({
			songId: '42',
			button: 4,
			pattern: 'SC',
			score: 98.5,
			maxCombo: true
		});
	});

	test('拒绝非法键位/分数', () => {
		const badButton = new FormData();
		badButton.set('songId', '1');
		badButton.set('button', '7');
		badButton.set('pattern', 'MX');
		badButton.set('score', '99');
		expect(() => parseDjmaxManualForm(badButton)).toThrow(AuthError);

		const badScore = new FormData();
		badScore.set('songId', '1');
		badScore.set('button', '4');
		badScore.set('pattern', 'MX');
		badScore.set('score', '101');
		expect(() => parseDjmaxManualForm(badScore)).toThrow(AuthError);
	});
});
