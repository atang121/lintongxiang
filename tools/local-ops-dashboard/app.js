const logEl = document.querySelector('#log');
const pm2ListEl = document.querySelector('#pm2-list');
const clearLog = document.querySelector('#clear-log');

function setDot(id, ok) {
  const dot = document.querySelector(id);
  dot.classList.remove('ok', 'bad');
  dot.classList.add(ok ? 'ok' : 'bad');
}

function writeLog(text) {
  const stamp = new Date().toLocaleTimeString();
  logEl.textContent = `[${stamp}] ${text}\n\n${logEl.textContent}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMs(value) {
  return value == null ? '-' : `${value}ms`;
}

function formatBytes(value) {
  if (!value) return '0 MB';
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

async function refreshStatus() {
  const response = await fetch('/api/status', { cache: 'no-store' });
  const status = await response.json();

  setDot('#front-dot', status.frontend.ok);
  document.querySelector('#front-text').textContent = status.frontend.ok ? '可访问' : '不可访问';
  document.querySelector('#front-sub').textContent = `${status.frontendUrl} · ${status.frontend.status || '无响应'} · ${formatMs(status.frontend.ms)}`;

  setDot('#css-dot', status.css.ok);
  document.querySelector('#css-text').textContent = status.css.ok ? '样式正常' : '样式异常';
  document.querySelector('#css-sub').textContent = status.css.css?.url || status.css.message || '未找到 CSS';

  setDot('#api-dot', status.api.ok);
  document.querySelector('#api-text').textContent = status.api.ok ? '健康' : '不可访问';
  document.querySelector('#api-sub').textContent = `${status.apiUrl}/api/health · ${status.api.status || '无响应'} · ${formatMs(status.api.ms)}`;

  if (!status.pm2.ok) {
    pm2ListEl.textContent = status.pm2.error || '无法读取 PM2。请确认从普通终端启动本面板。';
  } else if (status.pm2.processes.length === 0) {
    pm2ListEl.textContent = 'PM2 当前没有进程。';
  } else {
    pm2ListEl.innerHTML = status.pm2.processes.map((process) => `
      <div class="process-row">
        <div>
          <strong>${escapeHtml(process.name)}</strong>
          <small>id ${process.pm_id} · pid ${process.pid || '-'} · ${formatBytes(process.memory)} · CPU ${process.cpu}%</small>
        </div>
        <div class="process-actions">
          <span class="badge ${process.status === 'online' ? '' : 'bad'}">${escapeHtml(process.status)}</span>
          <button class="mini-button" data-pm2-restart="${escapeHtml(process.name)}">重启</button>
        </div>
      </div>
    `).join('');
  }
}

async function runTask(task) {
  const buttons = [...document.querySelectorAll('button')];
  buttons.forEach((button) => { button.disabled = true; });
  writeLog(`开始执行：${task}`);
  try {
    const response = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task }),
    });
    const result = await response.json();
    const output = [
      `${result.ok ? '成功' : '失败'}：${result.label || task}`,
      `命令：${result.command || '-'}`,
      `目录：${result.cwd || '-'}`,
      `耗时：${formatMs(result.durationMs)}`,
      result.stdout ? `\nstdout:\n${result.stdout}` : '',
      result.stderr ? `\nstderr:\n${result.stderr}` : '',
      result.error ? `\nerror:\n${result.error}` : '',
    ].filter(Boolean).join('\n');
    writeLog(output);
  } catch (error) {
    writeLog(`执行失败：${error.message || error}`);
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
    await refreshStatus();
  }
}

async function restartPm2Process(id) {
  const buttons = [...document.querySelectorAll('button')];
  buttons.forEach((button) => { button.disabled = true; });
  writeLog(`开始重启 PM2：${id}`);
  try {
    const response = await fetch('/api/pm2/restart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const result = await response.json();
    writeLog([
      `${result.ok ? '成功' : '失败'}：${result.label || id}`,
      `命令：${result.command || '-'}`,
      result.stdout ? `\nstdout:\n${result.stdout}` : '',
      result.stderr ? `\nstderr:\n${result.stderr}` : '',
      result.error ? `\nerror:\n${result.error}` : '',
    ].filter(Boolean).join('\n'));
  } catch (error) {
    writeLog(`重启失败：${error.message || error}`);
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
    await refreshStatus();
  }
}

document.addEventListener('click', async (event) => {
  const pm2Button = event.target.closest('[data-pm2-restart]');
  if (pm2Button) {
    await restartPm2Process(pm2Button.dataset.pm2Restart);
    return;
  }

  const taskButton = event.target.closest('[data-task]');
  if (taskButton) {
    await runTask(taskButton.dataset.task);
    return;
  }

  const actionButton = event.target.closest('[data-action]');
  if (actionButton?.dataset.action === 'refresh') {
    await refreshStatus();
  }
});

clearLog.addEventListener('click', () => {
  logEl.textContent = '日志已清空。';
});

refreshStatus().catch((error) => {
  writeLog(`状态刷新失败：${error.message || error}`);
});
