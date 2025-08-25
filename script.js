(function() {
  'use strict';

  /** State **/
  /** @typedef {{ id: string, text: string, completed: boolean, createdAt: number }} Task */
  /** @type {Task[]} */
  let tasks = [];

  /** Elements **/
  const inputEl = document.getElementById('task-input');
  const addBtnEl = document.getElementById('add-btn');
  const listEl = document.getElementById('task-list');
  const statsEl = document.getElementById('stats');
  const clearCompletedEl = document.getElementById('clear-completed');
  const clockEl = document.getElementById('live-clock');
  const dueTimeEl = document.getElementById('due-time');
  const universeCanvas = document.getElementById('universe');

  /** Utils **/
  function uid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function saveTasks() {
    try { localStorage.setItem('tasks', JSON.stringify(tasks)); } catch (_) {}
  }

  function loadTasks() {
    try {
      const raw = localStorage.getItem('tasks');
      tasks = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(tasks)) tasks = [];
    } catch (_) {
      tasks = [];
    }
  }

  function updateStats() {
    const total = tasks.length;
    const done = tasks.filter(t => t.completed).length;
    const remaining = total - done;
    statsEl.textContent = total === 0 ? 'No tasks yet — add your first ✨' : `${remaining} remaining · ${done} completed · ${total} total`;
  }

  /** Rendering **/
  function createIcon(pathD) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', pathD);
    p.setAttribute('fill', 'currentColor');
    svg.appendChild(p);
    return svg;
  }

  function render() {
    listEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item';

      // Left section: checkbox + text / editor
      const left = document.createElement('div');
      left.className = 'task-left';

      const checkbox = document.createElement('button');
      checkbox.className = 'checkbox' + (task.completed ? ' complete' : '');
      checkbox.setAttribute('aria-pressed', String(task.completed));
      checkbox.title = task.completed ? 'Mark as incomplete' : 'Mark as complete';
      checkbox.addEventListener('click', () => toggleComplete(task.id));
      const checkIcon = createIcon('M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z');
      checkbox.appendChild(checkIcon);

      const row = document.createElement('div');
      row.className = 'task-row';
      const text = document.createElement('div');
      text.className = 'task-text' + (task.completed ? ' muted' : '');
      text.textContent = task.text;
      const meta = document.createElement('div');
      meta.className = 'task-meta';
      const ts = formatTimestamp(task.createdAt);
      const due = task.dueTime ? ` · Due ${formatDueTime(task.dueTime)}` : '';
      meta.textContent = `${ts}${due}`;
      row.appendChild(text);
      row.appendChild(meta);

      left.appendChild(checkbox);
      left.appendChild(row);

      // Actions: edit, delete
      const actions = document.createElement('div');
      actions.className = 'task-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'icon-btn edit';
      editBtn.title = 'Edit task';
      editBtn.appendChild(createIcon('M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92L5.92 19.58zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'));
      editBtn.addEventListener('click', () => beginEdit(task.id));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'icon-btn delete';
      deleteBtn.title = 'Delete task';
      deleteBtn.appendChild(createIcon('M6 19c0 1.1.9 2 2 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'));
      deleteBtn.addEventListener('click', () => deleteTask(task.id));

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      li.appendChild(left);
      li.appendChild(actions);

      frag.appendChild(li);
    });
    listEl.appendChild(frag);
    updateStats();
  }

  /** CRUD **/
  function addTaskFromInput() {
    const value = (inputEl.value || '').trim();
    if (!value) return;
    const dueTime = sanitizeDueTime((dueTimeEl && dueTimeEl.value) || '');
    const task = { id: uid(), text: value, completed: false, createdAt: Date.now(), dueTime };
    tasks.unshift(task);
    saveTasks();
    inputEl.value = '';
    if (dueTimeEl) dueTimeEl.value = '';
    // Render and reveal the first item smoothly
    render();
    const first = listEl.firstElementChild;
    if (first) {
      first.classList.add('reveal');
      setTimeout(() => first.classList.remove('reveal'), 600);
    }
  }

  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
  }

  function toggleComplete(id) {
    tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveTasks();
    render();
  }

  function beginEdit(id) {
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return;

    // Replace text element with an input in-place
    const itemEl = Array.from(listEl.children).find(li => {
      const btn = li.querySelector('.task-actions .edit');
      return btn && btn.onclick == null; // ensure we are mapping by order
    });

    // Simpler: rebuild just this node inline
    const li = document.createElement('li');
    li.className = 'task-item';

    const left = document.createElement('div');
    left.className = 'task-left';

    const checkbox = document.createElement('button');
    checkbox.className = 'checkbox' + (tasks[index].completed ? ' complete' : '');
    checkbox.setAttribute('aria-pressed', String(tasks[index].completed));
    checkbox.addEventListener('click', () => toggleComplete(id));
    checkbox.appendChild(createIcon('M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'));

    const editor = document.createElement('input');
    editor.className = 'edit-input';
    editor.type = 'text';
    editor.value = tasks[index].text;
    editor.maxLength = 120;
    editor.autocomplete = 'off';

    left.appendChild(checkbox);
    left.appendChild(editor);

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'icon-btn edit';
    saveBtn.title = 'Save';
    saveBtn.appendChild(createIcon('M17 3H7a2 2 0 00-2 2v14l7-3 7 3V5a2 2 0 00-2-2z'));
    saveBtn.addEventListener('click', () => finishEdit(id, editor.value));

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'icon-btn';
    cancelBtn.title = 'Cancel';
    cancelBtn.appendChild(createIcon('M18.3 5.71L12 12.01l-6.3-6.3L4.29 7.1l6.3 6.3-6.3 6.29 1.41 1.41 6.3-6.3 6.29 6.3 1.41-1.41-6.3-6.29 6.3-6.3z'));
    cancelBtn.addEventListener('click', render);

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);

    li.appendChild(left);
    li.appendChild(actions);

    // Replace the original li at the same position in the DOM
    const originalLi = listEl.children[index];
    if (originalLi) listEl.replaceChild(li, originalLi);

    // Focus handling
    setTimeout(() => { editor.focus(); editor.selectionStart = editor.value.length; }, 0);

    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finishEdit(id, editor.value);
      if (e.key === 'Escape') render();
    });
  }

  function finishEdit(id, newText) {
    const value = (newText || '').trim();
    if (!value) {
      deleteTask(id);
      return;
    }
    tasks = tasks.map(t => t.id === id ? { ...t, text: value } : t);
    saveTasks();
    render();
  }

  /** Bulk actions **/
  function clearCompleted() {
    const hadCompleted = tasks.some(t => t.completed);
    if (!hadCompleted) return;
    tasks = tasks.filter(t => !t.completed);
    saveTasks();
    render();
  }

  /** Events **/
  addBtnEl.addEventListener('click', addTaskFromInput);
  inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTaskFromInput(); });
  clearCompletedEl.addEventListener('click', clearCompleted);

  /** Init **/
  function init() {
    loadTasks();
    render();
    startClock();
    // No more live time badge in button
    startUniverse();
    startSpaceDust();
  }
  document.addEventListener('DOMContentLoaded', init);

  /** Clock **/
  function startClock() {
    if (!clockEl) return;
    updateClock();
    setInterval(updateClock, 1000);
  }
  function updateClock() {
    const now = new Date();
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: '2-digit' };
    const dateStr = now.toLocaleDateString(undefined, options);
    const timeStr = now.toLocaleTimeString(undefined, { hour12: true });
    clockEl.textContent = `${dateStr} · ${timeStr}`;
  }

  function formatTimestamp(ts) {
    const d = new Date(ts);
    const date = d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
    return `Added ${date} at ${time}`;
  }

  /** Space dust (updated snow) **/
  const snowLayer = document.getElementById('snow');
  function startSpaceDust() {
    if (!snowLayer) return;
    const initial = 60;
    for (let i = 0; i < initial; i++) spawnDust(true);
    setInterval(() => spawnDust(false), 450);
  }
  function spawnDust(stagger) {
    if (!snowLayer) return;
    const el = document.createElement('div');
    el.className = 'crystal';
    const size = Math.random() * 6 + 4; // smaller
    const left = Math.random() * 100; // vw
    const duration = Math.random() * 10 + 12; // slower
    const delay = stagger ? Math.random() * duration : 0;
    const drift = (Math.random() - 0.5) * 120;
    const spin = (Math.random() * 180 + 90) * (Math.random() < 0.5 ? -1 : 1);
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.left = `${left}vw`;
    el.style.animationDuration = `${duration}s, ${duration}s`;
    el.style.animationDelay = `${delay}s, ${delay}s`;
    el.style.setProperty('--drift', `${drift}px`);
    el.style.setProperty('--spin', `${spin}deg`);
    snowLayer.appendChild(el);
    const life = (delay + duration) * 1000 + 300;
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, life);
  }

  /** Dark universe starfield **/
  function startUniverse() {
    if (!universeCanvas) return;
    const ctx = universeCanvas.getContext('2d');
    let width, height, stars;
    function resize() {
      width = universeCanvas.width = window.innerWidth;
      height = universeCanvas.height = window.innerHeight;
      stars = createStars(220);
    }
    function createStars(n) {
      const arr = [];
      for (let i = 0; i < n; i++) {
        arr.push({
          x: Math.random() * width,
          y: Math.random() * height,
          z: Math.random() * 0.6 + 0.4, // depth
          r: Math.random() * 0.9 + 0.3,
          tw: Math.random() * Math.PI * 2
        });
      }
      return arr;
    }
    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      for (const s of stars) {
        const alpha = 0.5 + Math.sin(s.tw) * 0.45;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.arc(s.x, s.y, s.r * s.z * 1.2, 0, Math.PI * 2);
        ctx.fill();
        s.tw += 0.02 * s.z;
        s.x += 0.02 * s.z; // gentle drift
        if (s.x > width + 2) s.x = -2;
      }
      requestAnimationFrame(draw);
    }
    window.addEventListener('resize', resize);
    resize();
    draw();
  }

  /** Due time helpers **/
  function sanitizeDueTime(value) {
    const v = String(value || '').trim();
    if (!v) return '';
    // input type=time yields HH:MM in 24h
    const m = v.match(/^(\d{2}):(\d{2})$/);
    if (!m) return '';
    const hh = Math.max(0, Math.min(23, Number(m[1])));
    const mm = Math.max(0, Math.min(59, Number(m[2])));
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  function formatDueTime(hhmm) {
    const [hh, mm] = (hhmm || '').split(':');
    if (hh == null || mm == null) return '';
    const d = new Date();
    d.setHours(Number(hh), Number(mm), 0, 0);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
  }
})();

