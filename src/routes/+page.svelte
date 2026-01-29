<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	type Phase = 'work' | 'break' | 'complete';

	type Settings = {
		workMinutes: number;
		breakMinutes: number;
		iterations: number;
	};

	const SETTINGS_KEY = 'pomodoro-settings-v1';
	const THEME_KEY = 'pomodoro-theme-v1';
	const NOTIFY_KEY = 'pomodoro-notify-v1';
	const defaultSettings: Settings = {
		workMinutes: 25,
		breakMinutes: 5,
		iterations: 4
	};

	let workMinutes = defaultSettings.workMinutes;
	let breakMinutes = defaultSettings.breakMinutes;
	let iterations = defaultSettings.iterations;

	let draftWorkMinutes = workMinutes;
	let draftBreakMinutes = breakMinutes;
	let draftIterations = iterations;

	let phase: Phase = 'work';
	let remainingSeconds = workMinutes * 60;
	let currentIteration = 1;
	let isRunning = false;

	let intervalId: ReturnType<typeof setInterval> | null = null;
	let lastTick = 0;
	let announceText = '';
	let theme = 'lcars-dark';
	let notificationsEnabled = false;
	let notificationStatus = 'Notifications unavailable.';
	let hasNotification = false;
	let notificationPermission: NotificationPermission = 'default';
	let isSettingsOpen = false;
	let isTauriApp = false;
	let tauriPermissionDenied = false;
	let tauriNotification: {
		isPermissionGranted: () => Promise<boolean>;
		requestPermission: () => Promise<NotificationPermission>;
		sendNotification: (options: { title: string; body?: string } | string) => Promise<void> | void;
	} | null = null;

	$: phaseLabel =
		phase === 'work' ? 'Work' : phase === 'break' ? 'Break' : 'Complete';
	$: phaseTotalSeconds =
		phase === 'work' ? workMinutes * 60 : phase === 'break' ? breakMinutes * 60 : 0;
	$: progressPercent =
		phaseTotalSeconds > 0
			? Math.max(0, Math.min(100, (remainingSeconds / phaseTotalSeconds) * 100))
			: 0;
	$: statusLabel = isRunning
		? 'Running'
		: phase === 'complete'
			? 'Complete'
			: 'Paused';

	const initializeNotifications = async () => {
		isTauriApp = typeof window !== 'undefined' && '__TAURI__' in window;
		if (isTauriApp) {
			try {
				const notificationModule = await import('@tauri-apps/plugin-notification');
				tauriNotification = notificationModule;
				hasNotification = true;
				const granted = await notificationModule.isPermissionGranted();
				notificationPermission = granted ? 'granted' : 'default';
				tauriPermissionDenied = false;
				updateNotificationStatus();
				return;
			} catch {
				tauriNotification = null;
			}
		}
		hasNotification = typeof Notification !== 'undefined';
		if (hasNotification) {
			notificationPermission = Notification.permission;
		}
		updateNotificationStatus();
	};

	onMount(() => {
		void initializeNotifications();
		const storedTheme = localStorage.getItem(THEME_KEY);
		if (storedTheme) {
			theme = storedTheme;
		}
		applyTheme(theme);
		loadNotificationPreference();

		const stored = loadSettings();
		if (stored) {
			applySettingsValues(stored);
			resetTimer(false);
		}

		announceText = `${phaseLabel} session ready.`;

		const handleKeydown = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement | null;
			if (!target) return;
			const isFormField =
				target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.isContentEditable;
			if (isFormField) return;

			if (isSettingsOpen) {
				if (event.key === 'Escape') {
					closeSettings();
				}
				return;
			}

			if (event.code === 'Space') {
				event.preventDefault();
				toggleTimer();
			}
			if (event.key.toLowerCase() === 'r') {
				resetTimer(true);
			}
			if (event.key.toLowerCase() === 's') {
				skipPhase();
			}
		};

		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		stopTimer();
	});

	const clamp = (value: number, min: number, max: number) =>
		Math.min(max, Math.max(min, Math.round(value)));

	const sanitizeSettings = (values: Partial<Settings>): Settings => {
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

	const loadSettings = (): Settings | null => {
		const raw = localStorage.getItem(SETTINGS_KEY);
		if (!raw) return null;
		try {
			return sanitizeSettings(JSON.parse(raw));
		} catch {
			return null;
		}
	};

	const persistSettings = (values: Settings) => {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(values));
	};

	const applyTheme = (value: string) => {
		theme = value;
		document.documentElement.dataset.theme = value;
		localStorage.setItem(THEME_KEY, value);
	};

	const loadNotificationPreference = () => {
		const stored = localStorage.getItem(NOTIFY_KEY);
		notificationsEnabled = stored === 'true';
		updateNotificationStatus();
	};

	const updateNotificationStatus = () => {
		if (!hasNotification) {
			notificationStatus = 'Notifications not supported in this environment.';
			return;
		}
		if (notificationPermission === 'granted') {
			notificationStatus = notificationsEnabled
				? 'Notifications enabled.'
				: 'Notifications available, but disabled.';
			return;
		}
		if (notificationPermission === 'denied') {
			notificationStatus = isTauriApp
				? 'Notifications blocked in system settings.'
				: 'Notifications blocked in browser settings.';
			return;
		}
		if (isTauriApp && tauriPermissionDenied) {
			notificationStatus = 'Notifications blocked in system settings.';
			return;
		}
		notificationStatus = 'Notifications need permission.';
	};

	const ensureNotificationPermission = async () => {
		if (!hasNotification) {
			notificationStatus = 'Notifications not supported in this environment.';
			updateNotificationStatus();
			return false;
		}
		if (notificationPermission === 'granted') return true;
		if (notificationPermission === 'denied') {
			updateNotificationStatus();
			return false;
		}
		if (isTauriApp && tauriNotification) {
			const permission = await tauriNotification.requestPermission();
			notificationPermission = permission;
			tauriPermissionDenied = permission === 'denied';
			updateNotificationStatus();
			return permission === 'granted';
		}
		const permission = await Notification.requestPermission();
		notificationPermission = permission;
		updateNotificationStatus();
		return permission === 'granted';
	};

	const requestNotificationPermission = async () => {
		const granted = await ensureNotificationPermission();
		if (granted) {
			notificationsEnabled = true;
			localStorage.setItem(NOTIFY_KEY, 'true');
			announceText = 'Notifications enabled.';
		}
	};

	const toggleNotifications = async () => {
		const nextValue = !notificationsEnabled;
		if (nextValue) {
			const granted = await ensureNotificationPermission();
			if (!granted) {
				announceText = 'Notifications unavailable.';
				return;
			}
		}
		notificationsEnabled = nextValue;
		localStorage.setItem(NOTIFY_KEY, String(notificationsEnabled));
		updateNotificationStatus();
		announceText = notificationsEnabled ? 'Notifications enabled.' : 'Notifications disabled.';
	};

	const sendNotification = (title: string, body: string) => {
		if (!notificationsEnabled) return;
		if (!hasNotification) return;
		if (notificationPermission !== 'granted') return;
		if (isTauriApp && tauriNotification) {
			tauriNotification.sendNotification({ title, body });
			return;
		}
		new Notification(title, {
			body
		});
	};

	const applySettingsValues = (values: Settings) => {
		workMinutes = values.workMinutes;
		breakMinutes = values.breakMinutes;
		iterations = values.iterations;
		draftWorkMinutes = values.workMinutes;
		draftBreakMinutes = values.breakMinutes;
		draftIterations = values.iterations;
	};

	const resetTimer = (announce: boolean) => {
		stopTimer();
		phase = 'work';
		currentIteration = 1;
		remainingSeconds = workMinutes * 60;
		if (announce) {
			announceText = 'Timer reset to start.';
		}
	};

	const formatTime = (totalSeconds: number) => {
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = Math.max(0, totalSeconds % 60);
		return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	};

	const startTimer = () => {
		if (phase === 'complete') {
			resetTimer(false);
		}
		if (isRunning) return;
		isRunning = true;
		lastTick = Date.now();
		intervalId = setInterval(() => {
			const now = Date.now();
			const deltaSeconds = Math.floor((now - lastTick) / 1000);
			if (deltaSeconds <= 0) return;
			lastTick += deltaSeconds * 1000;
			advanceTime(deltaSeconds);
		}, 250);
		announceText = 'Timer started.';
	};

	const pauseTimer = () => {
		if (!isRunning) return;
		stopTimer();
		announceText = 'Timer paused.';
	};

	const stopTimer = () => {
		isRunning = false;
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
	};

	const toggleTimer = () => {
		if (isRunning) {
			pauseTimer();
		} else {
			startTimer();
		}
	};

	const advancePhase = () => {
		if (phase === 'work') {
			if (currentIteration >= iterations) {
				phase = 'complete';
				remainingSeconds = 0;
				stopTimer();
				announceText = 'All iterations complete.';
				sendNotification('Pomodoro complete', 'All iterations finished.');
				return;
			}
			phase = 'break';
			remainingSeconds = breakMinutes * 60;
			announceText = 'Break started.';
			sendNotification('Break time', `Break for ${breakMinutes} minutes.`);
			return;
		}

		if (phase === 'break') {
			currentIteration += 1;
			phase = 'work';
			remainingSeconds = workMinutes * 60;
			announceText = 'Work session started.';
			sendNotification('Work session', `Focus for ${workMinutes} minutes.`);
		}
	};

	const advanceTime = (deltaSeconds: number) => {
		if (phase === 'complete') return;
		remainingSeconds -= deltaSeconds;
		if (remainingSeconds <= 0) {
			advancePhase();
		}
	};

	const skipPhase = () => {
		if (phase === 'complete') return;
		advancePhase();
	};

	const applySettings = () => {
		const sanitized = sanitizeSettings({
			workMinutes: draftWorkMinutes,
			breakMinutes: draftBreakMinutes,
			iterations: draftIterations
		});
		applySettingsValues(sanitized);
		persistSettings(sanitized);
		resetTimer(true);
		announceText = `Settings applied. ${workMinutes} minute work, ${breakMinutes} minute break.`;
	};

	const resetToDefaults = () => {
		applySettingsValues(defaultSettings);
		persistSettings(defaultSettings);
		resetTimer(true);
		announceText = 'Settings reset to classic defaults.';
	};

	const testNotification = async () => {
		const granted = await ensureNotificationPermission();
		if (!granted) {
			announceText = 'Notifications unavailable.';
			return;
		}
		if (!notificationsEnabled) {
			notificationsEnabled = true;
			localStorage.setItem(NOTIFY_KEY, 'true');
			updateNotificationStatus();
		}
		sendNotification('LCARS test', 'Notifications are online.');
	};

	const openSettings = () => {
		isSettingsOpen = true;
	};

	const closeSettings = () => {
		isSettingsOpen = false;
	};
</script>

<svelte:head>
	<title>LCARS Pomodoro</title>
	<meta
		name="description"
		content="Configurable Pomodoro timer with LCARS-inspired interface and accessible controls."
	/>
</svelte:head>

<main class="app" data-theme={theme}>
	<header class="topbar">
		<div class="brand">
			<div class="brand-pill" aria-hidden="true"></div>
			<div class="brand-text">
				<span class="brand-label">LCARS Operations</span>
				<h1 class="brand-title">Pomodoro Command</h1>
			</div>
		</div>
		<div class="topbar-actions">
			<button
				class="icon-button lcars-button settings-button"
				on:click={openSettings}
				aria-label="Open settings"
				aria-pressed={isSettingsOpen}
			>
				<span class="lcars-stub" aria-hidden="true"></span>
			</button>
			<div class="status-panel">
				<div class="status-row">
					<span class="status-label">Status</span>
					<span>{statusLabel}</span>
				</div>
				<div class="status-row">
					<span class="status-label">Phase</span>
					<span>{phaseLabel}</span>
				</div>
				<div class="status-row">
					<span class="status-label">Remaining</span>
					<span>{formatTime(remainingSeconds)}</span>
				</div>
			</div>
		</div>
	</header>

	<div class="content">
		<section class="panel" aria-labelledby="timer-title">
			<div class="panel-header">
				<h2 id="timer-title" class="panel-title">Timer</h2>
				<span
					class={`phase-badge ${
						phase === 'work'
							? 'phase-work'
							: phase === 'break'
								? 'phase-break'
								: 'phase-complete'
					}`}
				>
					{phaseLabel}
				</span>
			</div>
			<div class="timer-display" role="timer" aria-live="off">
				{formatTime(remainingSeconds)}
			</div>
			<div class="timer-subtitle">
				Iteration {currentIteration} of {iterations}
			</div>
			<div
				class="progress-track"
				role="progressbar"
				aria-label="Session progress"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(progressPercent)}
			>
				<div class="progress-fill" style={`width: ${progressPercent}%`}></div>
			</div>
			<div class="controls">
				<button
					class="button"
					on:click={toggleTimer}
					aria-pressed={isRunning}
					aria-keyshortcuts="Space"
				>
					{isRunning ? 'Pause' : phase === 'complete' ? 'Restart' : 'Start'}
				</button>
				<button class="button secondary" on:click={() => resetTimer(true)} aria-keyshortcuts="R">
					Reset
				</button>
				<button
					class="button ghost"
					on:click={skipPhase}
					disabled={phase === 'complete'}
					aria-keyshortcuts="S"
				>
					Skip
				</button>
			</div>
		</section>

	</div>

	{#if isSettingsOpen}
		<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="settings-title">
			<button class="overlay-backdrop" type="button" on:click={closeSettings} aria-label="Close settings"></button>
			<section class="overlay-panel panel" aria-labelledby="settings-title">
				<div class="panel-header">
					<h2 id="settings-title" class="panel-title">Settings</h2>
					<div class="overlay-actions">
						<span class="phase-badge phase-complete">LCARS</span>
						<button class="button ghost" type="button" on:click={closeSettings}>
							Close
						</button>
					</div>
				</div>
				<form class="settings-form" on:submit|preventDefault={applySettings}>
					<div class="settings-grid">
						<div class="settings-group">
							<div class="field">
								<label for="work-minutes">Work minutes</label>
								<input
									id="work-minutes"
									type="number"
									min="1"
									max="180"
									step="1"
									bind:value={draftWorkMinutes}
									inputmode="numeric"
									aria-describedby="work-help"
								/>
								<p id="work-help" class="field-help">Classic default: 25 minutes.</p>
							</div>
							<div class="field">
								<label for="break-minutes">Break minutes</label>
								<input
									id="break-minutes"
									type="number"
									min="1"
									max="60"
									step="1"
									bind:value={draftBreakMinutes}
									inputmode="numeric"
									aria-describedby="break-help"
								/>
								<p id="break-help" class="field-help">Classic default: 5 minutes.</p>
							</div>
							<div class="field">
								<label for="iterations">Iterations</label>
								<input
									id="iterations"
									type="number"
									min="1"
									max="12"
									step="1"
									bind:value={draftIterations}
									inputmode="numeric"
									aria-describedby="iterations-help"
								/>
								<p id="iterations-help" class="field-help">Classic default: 4 rounds.</p>
							</div>
						</div>
						<div class="settings-actions">
							<p class="field-help">Applying settings stops and resets the timer.</p>
							<fieldset class="field" aria-describedby="notification-help">
								<legend>Notifications</legend>
								<p id="notification-help" class="field-help">{notificationStatus}</p>
								<div class="settings-footer">
									{#if hasNotification && notificationPermission !== 'granted'}
										<button
											class="button secondary"
											type="button"
											on:click={requestNotificationPermission}
										>
											Request Permission
										</button>
									{/if}
									<button
										class="button ghost"
										type="button"
										on:click={toggleNotifications}
										disabled={!hasNotification || notificationPermission === 'denied'}
									>
										{notificationsEnabled ? 'Disable' : 'Enable'}
									</button>
									<button
										class="button"
										type="button"
										on:click={testNotification}
										disabled={!notificationsEnabled || notificationPermission !== 'granted'}
									>
										Test
									</button>
								</div>
							</fieldset>
							<div class="settings-footer">
								<button class="button secondary" type="submit">Apply</button>
								<button class="button ghost" type="button" on:click={resetToDefaults}>
									Reset Defaults
								</button>
							</div>
						</div>
					</div>
				</form>
			</section>
		</div>
	{/if}

	<p class="sr-only" aria-live="polite" aria-atomic="true">{announceText}</p>
</main>
