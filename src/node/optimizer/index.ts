import path from 'path';
import { build } from 'esbuild';
import { green } from 'picocolors';
import { scanPlugin } from './scanPlugin';
import { preBundlePlugin } from './preBundlePlugin';
import { PRE_BUNDLE_DIR } from '../constants';

export async function optimize(root: string) {
  /**
   * 1. 确定入口
   *
   * 暂时约定入口为 src/main.tsx
   */
  const entry = path.resolve(root, 'src/main.tsx');

  /**
   * 2. 从入口处扫描依赖
   */
  const deps = new Set<string>();
  await build({
    entryPoints: [entry],
    write: false,
    bundle: true,
    plugins: [scanPlugin(deps)],
  });

  console.log(
    `${green('需要预构建的依赖')}:\n${[...deps]
      .map(green)
      .map((item) => `  ${item}`)
      .join('\n')}`
  );

  /**
   * 3. 预构建依赖, 将依赖打包成 esm
   */
  await build({
    entryPoints: [...deps],
    write: true,
    bundle: true,
    splitting: true,
    format: 'esm',
    outdir: path.resolve(root, PRE_BUNDLE_DIR),
    plugins: [preBundlePlugin(deps)],
  });
}
