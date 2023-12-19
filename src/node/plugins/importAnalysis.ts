import { init, parse } from 'es-module-lexer';
import {
  BARE_IMPORT_RE,
  DEFAULT_EXTENSIONS,
  PRE_BUNDLE_DIR,
} from '../constants';
import { cleanUrl, isJSRequest, normalizePath } from '../utils';
import MagicString from 'magic-string';
import path from 'path';
import { Plugin } from '../plugin';
import { ServerContext } from '../server/index';
import { pathExists } from 'fs-extra';
import resolve from 'resolve';

/**
 * Server-only plugin that lexes, resolves, rewrites and analyzes url imports.
 *
 * 1. 静态资源, 加上 ?import 后缀
 * 2. 第三方依赖, 替换路径为预构建资源
 * 3. 导入其他的源码文件, 替换为导入源码的绝对路径
 */
export function importAnalysisPlugin(): Plugin {
  let serverContext: ServerContext;

  return {
    name: 'm-vite:import-analysis',
    configureServer(s) {
      serverContext = s;
    },
    async transform(code: string, id: string) {
      if (!isJSRequest(id)) {
        return null;
      }

      await init;

      const [imports] = parse(code);
      const ms = new MagicString(code);

      // 分析源码中的所有 import 语句
      for (const importInfo of imports) {
        const { s: modStart, e: modEnd, n: modSource } = importInfo;
        if (!modSource) continue;

        // 静态资源, 加上 ?import 后缀
        if (modSource.endsWith('.svg')) {
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
        }
        // 导入其他源码文件
        else if (modSource.startsWith('.') || modSource.startsWith('/')) {
          // 调用插件容器的上下文, 解析路径
          const resolved = await this.resolve(modSource, id);
          if (resolved) {
            ms.overwrite(modStart, modEnd, resolved.id);
          }
        }
      }

      return {
        map: ms.generateMap(),
        code: ms.toString(),
      };
    },
  };
}
