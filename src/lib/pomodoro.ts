export type Phase = 'work' | 'break' | 'complete';

export type Settings = {
	workMinutes: number;
	breakMinutes: number;
	iterations: number;
};

export const defaultSettings: Settings = {
	workMinutes: 25,
	breakMinutes: 5,
	iterations: 4
};

export const APP_TITLE = 'Temporal Interval Protocol';
export const STATUS_ONLY_TITLE = 'TIP';

export const getWindowTitle = (isStatusOnlyMode: boolean) =>
	isStatusOnlyMode ? STATUS_ONLY_TITLE : APP_TITLE;

export const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, Math.round(value)));

export const sanitizeSettings = (values: Partial<Settings>): Settings => {
	const work = Number.isFinite(values.workMinutes)
		? clamp(values.workMinutes as number, 1, 180)
		: defaultSettings.workMinutes;
	const rest = Number.isFinite(values.breakMinutes)
		? clamp(values.breakMinutes as number, 1, 60)
		: defaultSettings.breakMinutes;
	const rounds = Number.isFinite(values.iterations)
		? clamp(values.iterations as number, 1, 12)
		: defaultSettings.iterations;
	return { workMinutes: work, breakMinutes: rest, iterations: rounds };
};

export const parseStoredSettings = (raw: string | null): Settings | null => {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		if (parsed === null) return null;
		return sanitizeSettings(parsed as Partial<Settings>);
	} catch {
		return null;
	}
};

export const formatTime = (totalSeconds: number) => {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = Math.max(0, totalSeconds % 60);
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const getPhaseLabel = (phase: Phase) =>
	phase === 'work' ? 'Work' : phase === 'break' ? 'Break' : 'Complete';

export const getPhaseTotalSeconds = (phase: Phase, settings: Settings) =>
	phase === 'work'
		? settings.workMinutes * 60
		: phase === 'break'
			? settings.breakMinutes * 60
			: 0;

export const getProgressPercent = (remainingSeconds: number, phaseTotalSeconds: number) =>
	phaseTotalSeconds > 0
		? Math.max(0, Math.min(100, (remainingSeconds / phaseTotalSeconds) * 100))
		: 0;
