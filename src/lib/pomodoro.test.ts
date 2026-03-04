import { describe, expect, it } from 'vitest';

import {
	APP_TITLE,
	clamp,
	defaultSettings,
	formatTime,
	getPhaseLabel,
	getPhaseTotalSeconds,
	getProgressPercent,
	getWindowTitle,
	parseStoredSettings,
	sanitizeSettings,
	STATUS_ONLY_TITLE
} from './pomodoro';

describe('sanitizeSettings', () => {
	it('clamps values to allowed ranges', () => {
		const settings = sanitizeSettings({ workMinutes: 0, breakMinutes: 200, iterations: 13 });

		expect(settings).toEqual({
			workMinutes: 1,
			breakMinutes: 60,
			iterations: 12
		});
	});

	it('rounds floating values to nearest minute', () => {
		const settings = sanitizeSettings({ workMinutes: 24.6, breakMinutes: 4.4, iterations: 3.2 });

		expect(settings).toEqual({
			workMinutes: 25,
			breakMinutes: 4,
			iterations: 3
		});
	});

	it('falls back to defaults for non-finite values', () => {
		const settings = sanitizeSettings({
			workMinutes: Number.NaN,
			breakMinutes: Number.POSITIVE_INFINITY,
			iterations: Number.NEGATIVE_INFINITY
		});

		expect(settings).toEqual(defaultSettings);
	});
});

describe('parseStoredSettings', () => {
	it('returns null for invalid JSON', () => {
		expect(parseStoredSettings('{bad json}')).toBeNull();
	});

	it('returns null when stored value is null', () => {
		expect(parseStoredSettings('null')).toBeNull();
	});

	it('fills missing fields with defaults', () => {
		const settings = parseStoredSettings(JSON.stringify({ workMinutes: 30 }));

		expect(settings).toEqual({
			workMinutes: 30,
			breakMinutes: defaultSettings.breakMinutes,
			iterations: defaultSettings.iterations
		});
	});
});

describe('formatTime', () => {
	it('pads minutes and seconds to two digits', () => {
		expect(formatTime(65)).toBe('01:05');
		expect(formatTime(0)).toBe('00:00');
		expect(formatTime(3599)).toBe('59:59');
	});
});

describe('getProgressPercent', () => {
	it('clamps progress between 0 and 100', () => {
		expect(getProgressPercent(90, 60)).toBe(100);
		expect(getProgressPercent(-10, 60)).toBe(0);
	});

	it('returns 0 when phase total is zero', () => {
		expect(getProgressPercent(10, 0)).toBe(0);
	});
});

describe('getWindowTitle', () => {
	it('uses the status-only title when enabled', () => {
		expect(getWindowTitle(true)).toBe(STATUS_ONLY_TITLE);
	});

	it('uses the app title when disabled', () => {
		expect(getWindowTitle(false)).toBe(APP_TITLE);
	});
});

describe('clamp', () => {
	it('rounds and clamps values within range', () => {
		expect(clamp(24.6, 1, 60)).toBe(25);
		expect(clamp(0.4, 1, 60)).toBe(1);
		expect(clamp(100, 1, 60)).toBe(60);
	});
});

describe('getPhaseLabel', () => {
	it('returns correct labels for each phase', () => {
		expect(getPhaseLabel('work')).toBe('Work');
		expect(getPhaseLabel('break')).toBe('Break');
		expect(getPhaseLabel('complete')).toBe('Complete');
	});
});

describe('getPhaseTotalSeconds', () => {
	it('calculates work phase seconds', () => {
		expect(getPhaseTotalSeconds('work', { workMinutes: 25, breakMinutes: 5, iterations: 4 })).toBe(1500);
	});

	it('calculates break phase seconds', () => {
		expect(getPhaseTotalSeconds('break', { workMinutes: 25, breakMinutes: 5, iterations: 4 })).toBe(300);
	});

	it('returns 0 for complete phase', () => {
		expect(getPhaseTotalSeconds('complete', { workMinutes: 25, breakMinutes: 5, iterations: 4 })).toBe(0);
	});
});
