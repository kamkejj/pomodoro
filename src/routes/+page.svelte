<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import {
		defaultSettings,
		formatTime,
		getPhaseLabel,
		getPhaseTotalSeconds,
		getProgressPercent,
		parseStoredSettings,
		sanitizeSettings,
		type Phase,
		type Settings
	} from '$lib/pomodoro';

	const SETTINGS_KEY = 'pomodoro-settings-v1';
	const THEME_KEY = 'pomodoro-theme-v1';
	const NOTIFY_KEY = 'pomodoro-notify-v1';

	let workMinutes = defaultSettings.workMinutes;
	let breakMinutes = defaultSettings.breakMinutes;
	let iterations = defaultSettings.iterations;

	let draftWorkMinutes = workMinutes;
	let draftBreakMinutes = breakMinutes;
	let draftIterations = iterations;

	let phase: Phase = 'work';
	let remainingMilliseconds = workMinutes * 60 * 1000;
	let remainingSeconds = Math.ceil(remainingMilliseconds / 1000);
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

	$: phaseLabel = getPhaseLabel(phase);
	$: phaseTotalSeconds = getPhaseTotalSeconds(phase, {
		workMinutes,
		breakMinutes,
		iterations
	});
	$: phaseTotalMilliseconds = phaseTotalSeconds * 1000;
	$: remainingSeconds = Math.max(0, Math.ceil(remainingMilliseconds / 1000));
	$: progressPercent = getProgressPercent(remainingMilliseconds, phaseTotalMilliseconds);
	$: statusLabel = isRunning
		? 'Running'
		: phase === 'complete'
			? 'Complete'
			: 'Paused';

	const initializeNotifications = async () => {
		if (typeof window !== 'undefined') {
			try {
				const notificationModule = await import('@tauri-apps/plugin-notification');
				const granted = await notificationModule.isPermissionGranted();
				tauriNotification = notificationModule;
				isTauriApp = true;
				hasNotification = true;
				notificationPermission = granted ? 'granted' : 'default';
				tauriPermissionDenied = false;
				updateNotificationStatus();
				return;
			} catch {
				tauriNotification = null;
			}
		}
		isTauriApp = false;
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
			if (event.metaKey && event.key === ',') {
				event.preventDefault();
				openSettings();
				return;
			}
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

	const loadSettings = (): Settings | null =>
		parseStoredSettings(localStorage.getItem(SETTINGS_KEY));

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
		if (isTauriApp && tauriNotification) {
			tauriNotification.sendNotification({ title, body });
			return;
		}
		if (!hasNotification) return;
		if (notificationPermission !== 'granted') return;
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
		remainingMilliseconds = workMinutes * 60 * 1000;
		if (announce) {
			announceText = 'Timer reset to start.';
		}
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
			const deltaMilliseconds = now - lastTick;
			if (deltaMilliseconds <= 0) return;
			lastTick = now;
			advanceTime(deltaMilliseconds);
		}, 50);
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
				remainingMilliseconds = 0;
				stopTimer();
				announceText = 'All iterations complete.';
				sendNotification('Pomodoro complete', 'All iterations finished.');
				return;
			}
			phase = 'break';
			remainingMilliseconds = breakMinutes * 60 * 1000;
			announceText = 'Break started.';
			sendNotification('Break time', `Break for ${breakMinutes} minutes.`);
			return;
		}

		if (phase === 'break') {
			currentIteration += 1;
			phase = 'work';
			remainingMilliseconds = workMinutes * 60 * 1000;
			announceText = 'Work session started.';
			sendNotification('Work session', `Focus for ${workMinutes} minutes.`);
		}
	};

	const advanceTime = (deltaMilliseconds: number) => {
		if (phase === 'complete') return;
		remainingMilliseconds -= deltaMilliseconds;
		if (remainingMilliseconds <= 0) {
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
		if (!hasNotification) {
			announceText = 'Notifications unavailable.';
			return;
		}
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
				aria-keyshortcuts="Meta+,"
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
			<section class="overlay-panel panel settings-panel" aria-labelledby="settings-title">
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
								disabled={!hasNotification || notificationPermission === 'denied'}
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
