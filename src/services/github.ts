import type { AppData } from '../data/store';
import type { DataSetKey } from '../domain/validation';

const DATA_KEYS: DataSetKey[] = [
  'students',
  'periods',
  'rules',
  'attendance',
  'nowcoder',
  'codeforces'
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
  content?: string;
  sha: string;
  encoding?: string;
  message?: string;
}

export const githubConfig: GithubConfig = { owner, repo, branch };

function repositoryPath(key: DataSetKey): string {
  return `src/data/${key}.json`;
}

function rawUrl(key: DataSetKey): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${repositoryPath(key)}?t=${Date.now()}`;
}

function decodeBase64(value: string): string {
  const binary = atob(value.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function githubRequest<T>(url: string, token?: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/vnd.github+json');
  headers.set('X-GitHub-Api-Version', '2022-11-28');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(url, { ...init, headers });
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message || `GitHub HTTP ${response.status}`);
  return payload;
}

export async function fetchGithubData(): Promise<Partial<AppData>> {
  const entries = await Promise.all(
    DATA_KEYS.map(async (key) => {
      const response = await fetch(rawUrl(key), { cache: 'no-store' });
      if (!response.ok) throw new Error(`读取 ${key}.json 失败：HTTP ${response.status}`);
      return [key, JSON.parse(await response.text())] as const;
    })
  );
  return Object.fromEntries(entries) as Partial<AppData>;
}

async function getFileSha(key: DataSetKey, token: string): Promise<string | undefined> {
  const url = `${API_BASE}/repos/${owner}/${repo}/contents/${repositoryPath(key)}?ref=${encodeURIComponent(branch)}`;
  try {
    const payload = await githubRequest<GithubContentResponse>(url, token);
    return payload.sha;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Not Found')) return undefined;
    throw error;
  }
}

export async function commitGithubData(
  data: AppData,
  token: string,
  message: string
): Promise<GithubSyncResult[]> {
  if (!token.trim()) throw new Error('请填写 GitHub Token');
  if (!message.trim()) throw new Error('请填写提交说明');

  const results: GithubSyncResult[] = [];
  for (const key of DATA_KEYS) {
    const path = repositoryPath(key);
    const sha = await getFileSha(key, token);
    const url = `${API_BASE}/repos/${owner}/${repo}/contents/${path}`;
    const payload = await githubRequest<GithubContentResponse>(url, token, {
      method: 'PUT',
      body: JSON.stringify({
        message: `${message} (${key}.json)`,
        content: encodeBase64(`${JSON.stringify(data[key], null, 2)}\n`),
        branch,
        ...(sha ? { sha } : {})
      })
    });
    results.push({ key, path, sha: payload.content?.length ? payload.sha : sha || '' });
  }
  return results;
}

export function maskToken(token: string): string {
  if (token.length < 8) return token ? '********' : '';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}
