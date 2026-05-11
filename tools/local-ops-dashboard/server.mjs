import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const H5_DIR = path.join(ROOT, 'h5');
const SERVER_DIR = path.join(ROOT, 'server');
const HOST = '127.0.0.1';
const PORT = Number(process.env.OPS_DASHBOARD_PORT || 4318);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:3000';
const API_URL = process.env.API_URL || 'http://127.0.0.1:3001';

const tasks = {
  pm2List: {
    label: '查看 PM2',
    command: 'pm2',
    args: ['list'],
    cwd: ROOT,
  },
  buildFrontend: {
    label: '构建前端',
    command: 'npm',
    args: ['run', 'build'],
    cwd: H5_DIR,
  },
  buildServer: {
    label: '构建后端',
    command: 'npm',
    args: ['run', 'build'],
    cwd: SERVER_DIR,
  },
  startFrontend: {
    label: '启动前端 PM2',
    command: 'pm2',
    args: ['start', 'npm', '--name', 'tonglin-h5', '--', 'start', '--', '-p', '3000'],
    cwd: H5_DIR,
  },
  restartFrontend: {
    label: '重启前端 PM2',
    command: 'pm2',
    args: ['restart', 'tonglin-h5', '--update-env'],
    cwd: H5_DIR,
  },
  startApi: {
    label: '启动后端 PM2',
    command: 'pm2',
    args: ['start', 'dist/index.js', '--name', 'tonglin-api', '--update-env'],
    cwd: SERVER_DIR,
  },
  restartApi: {
    label: '重启后端 PM2',
    command: 'pm2',
    args: ['restart', 'tonglin-api', '--update-env'],
    cwd: SERVER_DIR,
  },
  savePm2: {
    label: '保存 PM2 状态',
    command: 'pm2',
    args: ['save'],
    cwd: ROOT,
  },
  backupSqlite: {
    label: '备份 SQLite',
    command: 'npm',
    args: ['run', 'backup:sqlite'],
    cwd: SERVER_DIR,
  },
};

function json(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function text(res, status, payload, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function runTask(task) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(task.command, task.args, {
      cwd: task.cwd,
      shell: false,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    const limit = 160_000;

    child.stdout.on('data', (chunk) => {
      stdout = (stdout + chunk.toString()).slice(-limit);
    });
    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-limit);
    });
    child.on('error', (error) => {
      resolve({
        ok: false,
        code: null,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr: `${stderr}${stderr ? '\n' : ''}${error.message}`,
      });
    });
    child.on('close', (code) => {
      resolve({
        ok: code === 0,
        code,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr,
      });
    });
  });
}

async function fetchStatus(url) {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(3500),
    });
    return {
      ok: response.ok,
      status: response.status,
      ms: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function verifyCss() {
  const home = await fetchStatus(FRONTEND_URL);
  if (!home.ok) {
    return { ok: false, home, cssHref: '', css: null, message: '首页不可访问' };
  }

  try {
    const htmlResponse = await fetch(FRONTEND_URL, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3500),
    });
    const html = await htmlResponse.text();
    const match = html.match(/href="([^"]+\.css)"/);
    const cssHref = match?.[1] || '';
    if (!cssHref) {
      return { ok: false, home, cssHref: '', css: null, message: '未找到 CSS 链接' };
    }

    const cssUrl = new URL(cssHref, FRONTEND_URL).toString();
    const startedAt = Date.now();
    const cssResponse = await fetch(cssUrl, {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(3500),
    });
    const css = {
      ok: cssResponse.ok,
      status: cssResponse.status,
      ms: Date.now() - startedAt,
      url: cssUrl,
    };
    return {
      ok: Boolean(home.ok && css.ok),
      home,
      cssHref,
      css,
      message: css.ok ? '首页和 CSS 均可访问' : 'CSS 请求失败',
    };
  } catch (error) {
    return {
      ok: false,
      home,
      cssHref: '',
      css: null,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function getPm2Summary() {
  const result = await runTask({
    command: 'pm2',
    args: ['jlist'],
    cwd: ROOT,
  });
  if (!result.ok) {
    return {
      ok: false,
      error: result.stderr || result.stdout || 'PM2 不可用',
      processes: [],
    };
  }

  try {
    const rows = parsePm2Jlist(result.stdout);
    return {
      ok: true,
      processes: rows.map((row) => ({
        name: row.name,
        pm_id: row.pm_id,
        status: row.pm2_env?.status || 'unknown',
        restart_time: row.pm2_env?.restart_time || 0,
        pid: row.pid,
        memory: row.monit?.memory || 0,
        cpu: row.monit?.cpu || 0,
      })),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      processes: [],
    };
  }
}

export function parsePm2Jlist(output) {
  const raw = String(output || '').trim();
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start < 0 || end < start) {
    throw new Error(raw ? `PM2 jlist 未返回 JSON：${raw.slice(0, 120)}` : 'PM2 jlist 未返回内容');
  }
  return JSON.parse(raw.slice(start, end + 1));
}

async function getStatus() {
  const [frontend, api, css, pm2] = await Promise.all([
    fetchStatus(FRONTEND_URL),
    fetchStatus(`${API_URL}/api/health`),
    verifyCss(),
    getPm2Summary(),
  ]);

  return {
    frontendUrl: FRONTEND_URL,
    apiUrl: API_URL,
    root: ROOT,
    frontend,
    api,
    css,
    pm2,
    generatedAt: new Date().toISOString(),
  };
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/status' && req.method === 'GET') {
    json(res, 200, await getStatus());
    return;
  }

  if (pathname === '/api/run' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 4096) req.destroy();
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const taskId = String(payload.task || '');
        const task = tasks[taskId];
        if (!task) {
          json(res, 400, { ok: false, error: '未知操作' });
          return;
        }
        const result = await runTask(task);
        json(res, 200, {
          task: taskId,
          label: task.label,
          command: [task.command, ...task.args].join(' '),
          cwd: task.cwd,
          ...result,
        });
      } catch (error) {
        json(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
    return;
  }

  if (pathname === '/api/pm2/restart' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 4096) req.destroy();
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const id = String(payload.id || '');
        if (!/^[\w.-]+$/.test(id)) {
          json(res, 400, { ok: false, error: 'PM2 进程 id/name 不合法' });
          return;
        }
        const result = await runTask({
          command: 'pm2',
          args: ['restart', id, '--update-env'],
          cwd: ROOT,
        });
        json(res, 200, {
          task: 'restartPm2Process',
          label: `重启 PM2 ${id}`,
          command: `pm2 restart ${id} --update-env`,
          cwd: ROOT,
          ...result,
        });
      } catch (error) {
        json(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
    return;
  }

  json(res, 404, { ok: false, error: 'Not found' });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  if (url.pathname.startsWith('/api/')) {
    await handleApi(req, res, url.pathname);
    return;
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    const html = await readFile(path.join(__dirname, 'index.html'), 'utf8');
    text(res, 200, html, 'text/html; charset=utf-8');
    return;
  }

  if (url.pathname === '/styles.css') {
    const css = await readFile(path.join(__dirname, 'styles.css'), 'utf8');
    text(res, 200, css, 'text/css; charset=utf-8');
    return;
  }

  if (url.pathname === '/app.js') {
    const js = await readFile(path.join(__dirname, 'app.js'), 'utf8');
    text(res, 200, js, 'text/javascript; charset=utf-8');
    return;
  }

  text(res, 404, 'Not found');
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, HOST, () => {
    console.log(`童邻市集本机运维面板: http://${HOST}:${PORT}`);
  });
}
