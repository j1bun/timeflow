// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
	console.log('DOM loaded, initializing app...');
	
	const listEl = document.getElementById('list');
	const addBtn = document.getElementById('addBtn');
	
	console.log('Elements found:', { listEl: !!listEl, addBtn: !!addBtn });
	
	if (!addBtn) {
		console.error('Add button not found!');
		return;
	}
	
	if (!listEl) {
		console.error('List element not found!');
		return;
	}

	const STORAGE_KEY = 'timeflow.timers.v1';

	// Fallback UUID generator for older browsers
	function generateId() {
		if (typeof crypto !== 'undefined' && crypto.randomUUID) {
			return crypto.randomUUID();
		}
		// Fallback for older browsers
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			const r = Math.random() * 16 | 0;
			const v = c === 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	}

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
				id: String(t.id || generateId()),
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
	let draggedElement = null;

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
		console.log('Adding timer...');
		const t = {
			id: generateId(),
			title: '',
			running: false,
			startEpochMs: null,
			elapsedMs: 0
		};
		timers.unshift(t);
		saveTimers(timers);
		render();
		console.log('Timer added, total timers:', timers.length);
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

	function reorderTimers(fromIndex, toIndex) {
		if (fromIndex === toIndex) return;
		const [moved] = timers.splice(fromIndex, 1);
		timers.splice(toIndex, 0, moved);
		saveTimers(timers);
		render();
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
		row.querySelector('.toggle').innerHTML = t.running ? '⏸' : '▶';
		row.querySelector('.toggle').setAttribute('aria-label', t.running ? 'Pause' : 'Start');
	}

	function createRow(t) {
		const row = document.createElement('div');
		row.className = 'row';
		row.setAttribute('data-row', t.id);
		row.draggable = true;

		const dragHandle = document.createElement('div');
		dragHandle.className = 'drag-handle';

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
		toggleBtn.innerHTML = t.running ? '⏸' : '▶';
		toggleBtn.setAttribute('aria-label', t.running ? 'Pause' : 'Start');
		toggleBtn.addEventListener('click', () => toggleTimer(t.id));
		toggleBtn.addEventListener('touchend', (e) => {
			e.preventDefault();
			toggleTimer(t.id);
		});

		const delBtn = document.createElement('button');
		delBtn.className = 'btn danger';
		delBtn.innerHTML = '🗑';
		delBtn.setAttribute('aria-label', 'Delete');
		delBtn.addEventListener('click', () => deleteTimer(t.id));
		delBtn.addEventListener('touchend', (e) => {
			e.preventDefault();
			deleteTimer(t.id);
		});

		actions.appendChild(toggleBtn);
		actions.appendChild(delBtn);

		// Drag events
		row.addEventListener('dragstart', (e) => {
			draggedElement = row;
			row.classList.add('dragging');
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/html', row.outerHTML);
		});

		row.addEventListener('dragend', () => {
			row.classList.remove('dragging');
			draggedElement = null;
		});

		row.addEventListener('dragenter', (e) => {
			e.preventDefault();
			if (draggedElement && draggedElement !== row) {
				row.style.borderColor = 'var(--primary)';
				row.style.backgroundColor = 'color-mix(in oklab, var(--panel), var(--primary) 10%)';
			}
		});

		row.addEventListener('dragleave', (e) => {
			// Only remove highlight if we're leaving the row entirely
			if (!row.contains(e.relatedTarget)) {
				row.style.borderColor = '';
				row.style.backgroundColor = '';
			}
		});

		row.addEventListener('dragover', (e) => {
			e.preventDefault();
			e.dataTransfer.dropEffect = 'move';
		});

		row.addEventListener('drop', (e) => {
			e.preventDefault();
			row.style.borderColor = '';
			row.style.backgroundColor = '';
			
			if (!draggedElement || draggedElement === row) return;
			
			const draggedId = draggedElement.getAttribute('data-row');
			const targetId = row.getAttribute('data-row');
			
			const draggedIndex = timers.findIndex(t => t.id === draggedId);
			const targetIndex = timers.findIndex(t => t.id === targetId);
			
			if (draggedIndex !== -1 && targetIndex !== -1) {
				reorderTimers(draggedIndex, targetIndex);
			}
			
			draggedElement = null;
		});

		row.appendChild(dragHandle);
		row.appendChild(timeEl);
		row.appendChild(inputEl);
		row.appendChild(actions);

		return row;
	}

	// Add event listeners
	addBtn.addEventListener('click', (e) => {
		console.log('Add button clicked!');
		e.preventDefault();
		addTimer();
	});
	
	addBtn.addEventListener('touchend', (e) => {
		console.log('Add button touched!');
		e.preventDefault();
		addTimer();
	});

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
	
	console.log('App initialized successfully!');
}); 