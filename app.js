const listEl = document.getElementById('list');
const addBtn = document.getElementById('addBtn');

const STORAGE_KEY = 'timeflow.timers.v1';

/** Timer type
 * { id: string, title: string, running: boolean, startEpochMs: number|null, elapsedMs: number }
 */

function loadTimers() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const arr = JSON.parse(raw);
		if (!Array.isArray(arr)) return [];
		return arr.map((t) => ({
			id: String(t.id || crypto.randomUUID()),
			title: typeof t.title === 'string' ? t.title : '',
			running: !!t.running,
			startEpochMs: typeof t.startEpochMs === 'number' ? t.startEpochMs : null,
			elapsedMs: typeof t.elapsedMs === 'number' ? t.elapsedMs : 0
		}));
	} catch (_) {
		return [];
	}
}

function saveTimers(timers) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
}

let timers = loadTimers();

function formatHMS(totalMs) {
	const totalSeconds = Math.floor(totalMs / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const pad = (n) => String(n).padStart(2, '0');
	return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function nowMs() { return Date.now(); }

function effectiveElapsedMs(timer) {
	if (!timer.running || !timer.startEpochMs) return timer.elapsedMs;
	return timer.elapsedMs + (nowMs() - timer.startEpochMs);
}

function addTimer() {
	const t = {
		id: crypto.randomUUID(),
		title: '',
		running: false,
		startEpochMs: null,
		elapsedMs: 0
	};
	timers.unshift(t);
	saveTimers(timers);
	render();
}

function toggleTimer(id) {
	const t = timers.find((x) => x.id === id);
	if (!t) return;
	if (t.running) {
		// pause
		t.elapsedMs = effectiveElapsedMs(t);
		t.running = false;
		t.startEpochMs = null;
	} else {
		// start
		t.running = true;
		t.startEpochMs = nowMs();
	}
	saveTimers(timers);
	renderRow(id);
}

function deleteTimer(id) {
	timers = timers.filter((t) => t.id !== id);
	saveTimers(timers);
	document.querySelector(`[data-row="${id}"]`)?.remove();
}

function renameTimer(id, title) {
	const t = timers.find((x) => x.id === id);
	if (!t) return;
	t.title = title.slice(0, 120);
	saveTimers(timers);
}

function render() {
	listEl.innerHTML = '';
	for (const t of timers) {
		listEl.appendChild(createRow(t));
	}
}

function renderRow(id) {
	const t = timers.find((x) => x.id === id);
	if (!t) return;
	const row = document.querySelector(`[data-row="${id}"]`);
	if (!row) return;
	row.querySelector('.time').textContent = formatHMS(effectiveElapsedMs(t));
	row.querySelector('.toggle').textContent = t.running ? 'Pause' : 'Start';
}

function createRow(t) {
	const row = document.createElement('div');
	row.className = 'row';
	row.setAttribute('data-row', t.id);

	const timeEl = document.createElement('div');
	timeEl.className = 'time';
	timeEl.textContent = formatHMS(effectiveElapsedMs(t));

	const inputEl = document.createElement('input');
	inputEl.className = 'input';
	inputEl.type = 'text';
	inputEl.placeholder = 'Section...';
	inputEl.value = t.title;
	inputEl.addEventListener('input', (e) => renameTimer(t.id, e.target.value));

	const actions = document.createElement('div');
	actions.className = 'actions';

	const toggleBtn = document.createElement('button');
	toggleBtn.className = 'btn primary toggle';
	toggleBtn.textContent = t.running ? 'Pause' : 'Start';
	toggleBtn.addEventListener('click', () => toggleTimer(t.id));

	const delBtn = document.createElement('button');
	delBtn.className = 'btn danger';
	delBtn.textContent = 'Delete';
	delBtn.addEventListener('click', () => deleteTimer(t.id));

	actions.appendChild(toggleBtn);
	actions.appendChild(delBtn);

	row.appendChild(timeEl);
	row.appendChild(inputEl);
	row.appendChild(actions);

	return row;
}

addBtn.addEventListener('click', addTimer);

// animation frame update
let rafId = 0;
function loop() {
	for (const t of timers) {
		if (!t.running) continue;
		const row = document.querySelector(`[data-row="${t.id}"]`);
		if (row) row.querySelector('.time').textContent = formatHMS(effectiveElapsedMs(t));
	}
	rafId = requestAnimationFrame(loop);
}

render();
rafId = requestAnimationFrame(loop);

document.addEventListener('visibilitychange', () => {
	if (document.hidden) {
		cancelAnimationFrame(rafId);
	} else {
		rafId = requestAnimationFrame(loop);
	}
}); 