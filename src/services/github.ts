import type { AppData } from '../data/store';
import { validateAppData, type DataSetKey } from '../domain/validation';

const DATA_KEYS: DataSetKey[] = [
  'students',
  'periods',
  'rules',
  'attendance',
  'nowcoder',
  'codeforces',
  'helpPosts',
  'helpResources'
];
const API_BASE = 'https://api.github.com';
const owner = import.meta.env.VITE_GITHUB_OWNER || 'Bhu-Acm';
const repo = import.meta.env.VITE_GITHUB_REPO || 'acm-grade2';
const branch = import.meta.env.VITE_GITHUB_BRANCH || 'main';

export interface GithubConfig {
  owner: string;
  repo: string;
  branch: string;
}

export interface GithubSyncResult {
  key: DataSetKey;
  path: string;
  sha: string;
}

interface GithubContentResponse {
  content: string;
  sha: string;
  encoding: string;
  message?: string;
}

interface GithubRefResponse {
  object: {
    sha: string;
  };
  message?: string;
}

interface GithubCommitResponse {
  sha: string;
  tree: {
    sha: string;
  };
  message?: string;
}

interface GithubBlobResponse {
  sha: string;
  message?: string;
}

interface GithubTreeResponse {
  sha: string;
  message?: string;
}

export const githubConfig: GithubConfig = { owner, repo, branch };

function repositoryPath(key: DataSetKey): string {
  return `src/data/${key}.json`;
}

function decodeBase64(value: string): string {
  const binary = atob(value.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function githubRequest<T>(url: string, token?: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/vnd.github+json');
  headers.set('X-GitHub-Api-Version', '2022-11-28');
  if (token?.trim()) headers.set('Authorization', `Bearer ${token.trim()}`);

  const response = await fetch(url, { ...init, headers });
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message || `GitHub HTTP ${response.status}`);
  return payload;
}

async function fetchGithubFile(key: DataSetKey, token?: string): Promise<unknown> {
  const url = `${API_BASE}/repos/${owner}/${repo}/contents/${repositoryPath(key)}?ref=${encodeURIComponent(branch)}`;
  const payload = await githubRequest<GithubContentResponse>(url, token);
  if (payload.encoding !== 'base64') {
    throw new Error(`读取 ${key}.json 失败：GitHub 返回了未知编码 ${payload.encoding}`);
  }
  return JSON.parse(decodeBase64(payload.content));
}

export async function fetchGithubData(token?: string): Promise<AppData> {
  const entries = await Promise.all(
    DATA_KEYS.map(async (key) => [key, await fetchGithubFile(key, token)] as const)
  );
  const data = Object.fromEntries(entries) as unknown as AppData;
  const errors = validateAppData(data);
  if (errors.length) {
    throw new Error(`GitHub 远端数据校验失败：${errors[0]}`);
  }
  return data;
}

async function getBranchHead(token: string): Promise<GithubRefResponse> {
  return githubRequest<GithubRefResponse>(
    `${API_BASE}/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
    token
  );
}

async function getCommit(sha: string, token: string): Promise<GithubCommitResponse> {
  return githubRequest<GithubCommitResponse>(
    `${API_BASE}/repos/${owner}/${repo}/git/commits/${sha}`,
    token
  );
}

export async function commitGithubData(
  data: AppData,
  token: string,
  message: string
): Promise<GithubSyncResult[]> {
  if (!token.trim()) throw new Error('请填写 GitHub Token');
  if (!message.trim()) throw new Error('请填写提交说明');

  const errors = validateAppData(data);
  if (errors.length) throw new Error(`本地草稿校验失败：${errors[0]}`);

  const head = await getBranchHead(token);
  const currentCommit = await getCommit(head.object.sha, token);

  const blobs = await Promise.all(
    DATA_KEYS.map(async (key) => {
      const payload = await githubRequest<GithubBlobResponse>(
        `${API_BASE}/repos/${owner}/${repo}/git/blobs`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            content: `${JSON.stringify(data[key], null, 2)}\n`,
            encoding: 'utf-8'
          })
        }
      );

      return {
        key,
        path: repositoryPath(key),
        sha: payload.sha
      };
    })
  );

  const nextTree = await githubRequest<GithubTreeResponse>(
    `${API_BASE}/repos/${owner}/${repo}/git/trees`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        base_tree: currentCommit.tree.sha,
        tree: blobs.map((item) => ({
          path: item.path,
          mode: '100644',
          type: 'blob',
          sha: item.sha
        }))
      })
    }
  );

  const nextCommit = await githubRequest<GithubCommitResponse>(
    `${API_BASE}/repos/${owner}/${repo}/git/commits`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        message,
        tree: nextTree.sha,
        parents: [head.object.sha]
      })
    }
  );

  await githubRequest(
    `${API_BASE}/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({
        sha: nextCommit.sha,
        force: false
      })
    }
  );

  return blobs;
}

export function maskToken(token: string): string {
  if (token.length < 8) return token ? '********' : '';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}
