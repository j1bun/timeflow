const timeDisplay = document.getElementById('timeDisplay');
const startPauseBtn = document.getElementById('startPauseBtn');
const resetBtn = document.getElementById('resetBtn');
const labelInput = document.getElementById('labelInput');

const STORAGE_KEY = 'timeflow.stopwatch.v1';

/**
 * Persisted shape:
 * { running: boolean, startEpochMs: number|null, elapsedMs: number, label: string }
 */
function loadState() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { running: false, startEpochMs: null, elapsedMs: 0, label: '' };
		const parsed = JSON.parse(raw);
		return {
			running: !!parsed.running,
			startEpochMs: typeof parsed.startEpochMs === 'number' ? parsed.startEpochMs : null,
			elapsedMs: typeof parsed.elapsedMs === 'number' ? parsed.elapsedMs : 0,
			label: typeof parsed.label === 'string' ? parsed.label : ''
		};
	} catch (_) {
		return { running: false, startEpochMs: null, elapsedMs: 0, label: '' };
	}
}

function saveState(state) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

function formatHMS(totalMs) {
	const totalSeconds = Math.floor(totalMs / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const pad = (n) => String(n).padStart(2, '0');
	return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function nowMs() {
	return Date.now();
}

function getElapsedMs(s) {
	if (!s.running || !s.startEpochMs) return s.elapsedMs;
	return s.elapsedMs + (nowMs() - s.startEpochMs);
}

function updateUI() {
	timeDisplay.textContent = formatHMS(getElapsedMs(state));
	labelInput.value = state.label;
	startPauseBtn.textContent = state.running ? 'Pause' : 'Start';
	startPauseBtn.setAttribute('aria-pressed', state.running ? 'true' : 'false');
}

function start() {
	if (state.running) return;
	state.running = true;
	state.startEpochMs = nowMs();
	saveState(state);
	updateUI();
}

function pause() {
	if (!state.running) return;
	state.elapsedMs = getElapsedMs(state);
	state.running = false;
	state.startEpochMs = null;
	saveState(state);
	updateUI();
}

function reset() {
	state = { running: false, startEpochMs: null, elapsedMs: 0, label: '' };
	saveState(state);
	updateUI();
}

startPauseBtn.addEventListener('click', () => {
	if (state.running) pause(); else start();
});

resetBtn.addEventListener('click', () => {
	reset();
});

labelInput.addEventListener('input', (e) => {
	state.label = e.target.value.slice(0, 120);
	saveState(state);
});

// Update loop
let rafId = 0;
function loop() {
	updateUI();
	rafId = requestAnimationFrame(loop);
}
rafId = requestAnimationFrame(loop);

// Restore UI on load
updateUI();

// Stop animation frame when page hidden to save battery
document.addEventListener('visibilitychange', () => {
	if (document.hidden) {
		cancelAnimationFrame(rafId);
	} else {
		rafId = requestAnimationFrame(loop);
	}
}); 