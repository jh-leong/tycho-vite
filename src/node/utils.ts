import os from 'os';
import path from 'path';
import {
  CLIENT_PUBLIC_PATH,
  HASH_RE,
  JS_TYPES_RE,
  QUERY_RE,
} from './constants';

export function slash(p: string): string {
  return p.replace(/\\/g, '/');
}

export const isWindows = os.platform() === 'win32';

/**
 * 兼容 Windows 系统的路径处理
 */
export function normalizePath(id: string): string {
  return path.posix.normalize(isWindows ? slash(id) : id);
}

export const isJSRequest = (id: string): boolean => {
  id = cleanUrl(id);

  // js, ts, jsx, tsx, mjs
  if (JS_TYPES_RE.test(id)) {
    return true;
  }

  // without extension && !dir
  if (!path.extname(id) && !id.endsWith('/')) {
    return true;
  }

  return false;
};

/**
 * 去除 url 中的 hash 和 query
 */
export const cleanUrl = (url: string): string =>
  url.replace(HASH_RE, '').replace(QUERY_RE, '');

export const isCSSRequest = (id: string): boolean =>
  cleanUrl(id).endsWith('.css');

export function isImportRequest(url: string): boolean {
  return url.endsWith('?import');
}

const INTERNAL_LIST = [CLIENT_PUBLIC_PATH, '/@react-refresh'];

export function isInternalRequest(url: string): boolean {
  return INTERNAL_LIST.includes(url);
}

export function removeImportQuery(url: string): string {
  return url.replace(/\?import$/, '');
}

export function isPlainObject(obj: any): boolean {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

/**
 * 解析文件相对于 root 的路径, 解析后路径开头没有 '/'
 */
export function getShortName(file: string, root: string) {
  return file.startsWith(root + '/') ? path.posix.relative(root, file) : file;
}
