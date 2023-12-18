import { Loader, Plugin } from 'esbuild';
import { BARE_IMPORT_RE } from '../constants';
import { init, parse } from 'es-module-lexer';
import path from 'path';
import resolve from 'resolve';
import fs from 'fs-extra';
import createDebug from 'debug';
import { normalizePath } from '../utils';
import { green, gray } from 'picocolors';

const debug = createDebug('dev');
debug.enabled = true;

export function preBundlePlugin(deps: Set<string>): Plugin {
  return {
    name: 'esbuild:pre-bundle',
    setup(build) {
      build.onResolve(
        {
          filter: BARE_IMPORT_RE,
        },
        (resolveInfo) => {
          const { path: id, importer } = resolveInfo;
          const isEntry = !importer;

          // console.log(
          //   (deps.has(id) ? green : gray)(
          //     `🚀\n ~ file: preBundlePlugin.ts:22 ~ onResolve > path: ${id}`
          //   )
          // );

          // 命中需要预编译的依赖
          if (deps.has(id)) {
            /**
             * 只标记依赖中的入口文件
             */
            return isEntry
              ? {
                  path: id,
                  namespace: 'dep',
                }
              : {
                  // 因为走到 onResolve 了，所以这里的 path 就是绝对路径了
                  path: resolve.sync(id, { basedir: process.cwd() }),
                };
          }
        }
      );

      /**
       * 加载依赖模块时, 代理模块内容
       *
       * 1. 分析依赖源码中的导入导出
       * 2. 代理模块内容, 让后续 esbuild 打包生成的 esm 中, 包含 具名导出 和 默认值导出
       */
      build.onLoad(
        {
          filter: /.*/,
          namespace: 'dep',
        },
        async (loadInfo) => {
          await init;

          const id = loadInfo.path;
          const root = process.cwd();
          // 定位到依赖的绝对路径
          const entryPath = normalizePath(resolve.sync(id, { basedir: root }));

          // console.log(
          //   `🚀\n ~ file: preBundlePlugin.ts:56 ~ onLoad > (${id}) entryPath:`,
          //   entryPath
          // );

          // 读取依赖的源码
          const code = await fs.readFile(entryPath, 'utf-8');
          // 分析依赖源码的导入导出
          const [imports, exports] = await parse(code);

          const proxyModule = [];

          // cjs
          if (!imports.length && !exports.length) {
            const res = require(entryPath);
            const specifiers = Object.keys(res);

            proxyModule.push(
              /**
               * * 加了这一行, 后续 esbuild 构建的产物中就会具名导出 cjs 模块中的所有信息
               *
               * 支持在其他模块中, 具名导入依赖
               *  - 一些库, 比如 react 是打包后, 只有默认导出 `export default react`
               *  - 支持在其他模块中, 具名导入依赖 `import { useState } from 'react'`
               */
              `export { ${specifiers.join(',')} } from "${entryPath}"`,
              `export default require("${entryPath}")`
            );
          } else {
            // esm
            // 直接 export * 或者 export default 即可
            if (exports.some((i) => i.n === 'default')) {
              proxyModule.push(
                `import d from "${entryPath}"; export default d`
              );
            }

            proxyModule.push(`export * from "${entryPath}"`);
          }

          // debug('代理模块内容: %o', proxyModule.join('\n'));

          const loader = path.extname(entryPath).slice(1);

          return {
            // 模块加载器类型, 决定了 esbuild 如何处理模块
            loader: loader as Loader,
            // 替换模块内容
            contents: proxyModule.join('\n'),
            // 模块解析的基础目录
            resolveDir: root,
          };
        }
      );
    },
  };
}
