import { init, parse } from 'es-module-lexer';
import {
  BARE_IMPORT_RE,
  CLIENT_PUBLIC_PATH,
  DEFAULT_EXTENSIONS,
  PRE_BUNDLE_DIR,
} from '../constants';
import {
  cleanUrl,
  getShortName,
  isInternalRequest,
  isJSRequest,
  normalizePath,
} from '../utils';
import MagicString from 'magic-string';
import path from 'path';
import { Plugin } from '../plugin';
import { ServerContext } from '../server/index';
import { pathExists } from 'fs-extra';
import resolve from 'resolve';

/**
 * Server-only plugin that lexes, resolves, rewrites and analyzes url imports.
 *
 * 1. 对于源码中的 import 语句, 分析出导入的模块路径
 *  - 静态资源, 加上 ?import 后缀
 *  - 第三方依赖, 替换路径为预构建资源
 *  - 源码文件, 替换为导入源码的绝对路径
 *
 * 2. 对业务源码, 在顶部注入 HMR 相关的工具函数
 */
export function importAnalysisPlugin(): Plugin {
  let serverContext: ServerContext;

  return {
    name: 'm-vite:import-analysis',
    configureServer(s) {
      serverContext = s;
    },
    async transform(code: string, id: string) {
      if (!isJSRequest(id) || isInternalRequest(id)) {
        return null;
      }

      const importedModules = new Set<string>();

      const { moduleGraph } = serverContext;
      const curMod = moduleGraph.getModuleById(id)!;

      const resolve = async (id: string, importer?: string) => {
        const resolved = await this.resolve(
          id,
          importer ? normalizePath(importer) : importer
        );
        if (!resolved) return;

        let resolvedId = `/${getShortName(resolved.id, serverContext.root)}`;

        // 假如模块已经被加载过, 给解析的路径添加时间戳
        const cleanedId = cleanUrl(resolved.id);
        const mod = moduleGraph.getModuleById(cleanedId);
        if (mod && mod.lastHMRTimestamp > 0) {
          resolvedId += '?t=' + mod.lastHMRTimestamp;
        }

        return resolvedId;
      };

      await init;
      const [imports] = parse(code);
      const ms = new MagicString(code);

      // 1. 分析源码中的 import 语句
      for (const importInfo of imports) {
        const { s: modStart, e: modEnd, n: modSource } = importInfo;
        if (!modSource) continue;

        // 静态资源, 加上 ?import 后缀
        if (modSource.endsWith('.svg')) {
          // todo: 假设 svg 文件和源码文件在同一目录下
          const resolvedUrl = path.join(path.dirname(id), modSource);
          ms.overwrite(modStart, modEnd, `${resolvedUrl}?import`);
          continue;
        }

        // 第三方依赖, 替换路径为预构建资源
        if (BARE_IMPORT_RE.test(modSource)) {
          const bundlePath = normalizePath(
            path.join('/', PRE_BUNDLE_DIR, `${modSource}.js`)
          );

          ms.overwrite(modStart, modEnd, bundlePath);
          importedModules.add(bundlePath);
        }
        // 源码文件
        else if (modSource.startsWith('.') || modSource.startsWith('/')) {
          // 解析为绝对路径
          const resolved = await resolve(modSource, id);

          if (resolved) {
            ms.overwrite(modStart, modEnd, resolved);
            importedModules.add(resolved);
          }
        }
      }

      // 2. 对业务源码注入, 注入 HMR 相关的工具函数
      if (!id.includes('node_modules')) {
        ms.prepend(
          `import { createHotContext as __vite__createHotContext } from "${CLIENT_PUBLIC_PATH}";\n` +
            `import.meta.hot = __vite__createHotContext(${JSON.stringify(
              cleanUrl(curMod.url)
            )});`
        );
      }

      moduleGraph.updateModuleInfo(curMod, importedModules);

      return {
        map: ms.generateMap(),
        code: ms.toString(),
      };
    },
  };
}
