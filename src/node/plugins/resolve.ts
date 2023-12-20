import resolve from 'resolve';
import { Plugin } from '../plugin';
import { ServerContext } from '../server/index';
import path from 'path';
import { pathExists } from 'fs-extra';
import { DEFAULT_EXTENSIONS } from '../constants';
import { cleanUrl, normalizePath } from '../utils';

export function resolvePlugin(): Plugin {
  let serverContext: ServerContext;
  return {
    name: 'm-vite:resolve',
    configureServer(s) {
      serverContext = s;
    },
    /**
     * 解析为绝对路径
     */
    async resolveId(id: string, importer?: string) {
      // 1. 绝对路径
      if (path.isAbsolute(id)) {
        if (await pathExists(id)) return { id };

        // 拼接 root 作为前缀，处理 /src/main.tsx 的情况
        id = path.join(serverContext.root, id);
        if (await pathExists(id)) return { id };
      }
      // 2. 相对路径
      else if (id.startsWith('.')) {
        if (!importer) {
          throw new Error('`importer` should not be undefined');
        }

        const hasExtension = path.extname(id).length > 1;

        // 2.1 包含文件名后缀
        let resolvedId: string;
        if (hasExtension) {
          resolvedId = normalizePath(
            resolve.sync(id, { basedir: path.dirname(importer) })
          );

          if (await pathExists(resolvedId)) return { id: resolvedId };
        }
        // 2.2 不包含文件名后缀, 尝试添加后缀定位文件
        else {
          for (const extname of DEFAULT_EXTENSIONS) {
            try {
              const withExtension = `${id}${extname}`;
              resolvedId = normalizePath(
                resolve.sync(withExtension, {
                  basedir: path.dirname(importer),
                })
              );
              if (await pathExists(resolvedId)) {
                return { id: resolvedId };
              }
            } catch (e) {
              continue;
            }
          }
        }
      }

      return null;
    },
  };
}
