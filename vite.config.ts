import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { syncAllStudentsLocally } from './scripts/lib/local-sync.mjs';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'acm-grade2';
const base = process.env.GITHUB_ACTIONS === 'true' ? `/${repositoryName}/` : '/';

function readJsonBody(request: IncomingMessage) {
  return new Promise<any>((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function sendJson(response: ServerResponse, statusCode: number, value: unknown) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(value));
}

function localSyncPlugin() {
  return {
    name: 'local-sync-plugin',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use('/__dev/sync/all', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: 'Method Not Allowed' });
          return;
        }

        try {
          const payload = await readJsonBody(request);
          const result = await syncAllStudentsLocally(payload);
          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, 500, {
            error: error instanceof Error ? error.message : '本地同步失败'
          });
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [vue(), localSyncPlugin()],
  define: {
    __PROJECT_ROOT__: JSON.stringify(process.cwd())
  },
  base
});
