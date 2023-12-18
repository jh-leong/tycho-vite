import path from 'path';

/**
 * 预构建过程中, 依赖扫描时需要过滤的文件类型
 */
export const EXTERNAL_TYPES = [
  'css',
  'less',
  'sass',
  'scss',
  'styl',
  'stylus',
  'pcss',
  'postcss',
  'vue',
  'svelte',
  'marko',
  'astro',
  'png',
  'jpe?g',
  'gif',
  'svg',
  'ico',
  'webp',
  'avif',
];

export const BARE_IMPORT_RE = /^[\w@][^:]/;

/**
 * 约定: 预构建产物路径 `node_modules/.m-vite`
 */
export const PRE_BUNDLE_DIR = path.join('node_modules', '.m-vite');

export const JS_TYPES_RE = /\.(?:j|t)sx?$|\.mjs$/;
export const QUERY_RE = /\?.*$/s;
export const HASH_RE = /#.*$/s;

export const DEFAULT_EXTENSIONS = ['.tsx', '.ts', '.jsx', 'js'];
