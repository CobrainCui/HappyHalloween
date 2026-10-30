import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT) || 4173;
// 默认只给自己看；npm run start:lan 时才让同一 Wi-Fi 下的手机连进来。
const LAN = process.env.HOST === '0.0.0.0' || process.argv.includes('--lan');
const HOST = process.env.HOST || (LAN ? '0.0.0.0' : '127.0.0.1');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const filePath = resolve(ROOT, `.${pathname}`);

    if (!filePath.startsWith(ROOT.endsWith(sep) ? ROOT : `${ROOT}${sep}`)) {
      response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Forbidden');
      return;
    }

    const fileStat = await stat(filePath);
    const finalPath = fileStat.isDirectory() ? resolve(filePath, 'index.html') : filePath;
    const body = await readFile(finalPath);

    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extname(finalPath).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(body);
  } catch (error) {
    const status = error?.code === 'ENOENT' ? 404 : 500;
    response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(status === 404 ? 'Not found' : 'Server error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n  🎃 给老师送南瓜派已点亮：http://127.0.0.1:${PORT}\n`);
  if (LAN) {
    const addresses = Object.values(networkInterfaces())
      .flat()
      .filter((item) => item && item.family === 'IPv4' && !item.internal)
      .map((item) => item.address);
    for (const address of addresses) {
      console.log(`  手机同 Wi-Fi 打开：http://${address}:${PORT}`);
    }
    if (!addresses.length) {
      console.log('  没找到局域网地址，检查一下 Wi-Fi 连接。');
    }
    console.log('');
  }
  console.log('  按 Ctrl+C 熄灭灯火。\n');
});
