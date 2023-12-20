import { CLIENT_PUBLIC_PATH, HMR_PORT } from '../constants';
import { Plugin } from '../plugin';
import fs from 'fs-extra';
import path from 'path';
import { ServerContext } from '../server/index';

export function clientInjectPlugin(): Plugin {
  let serverContext: ServerContext;

  return {
    name: 'm-vite:client-inject',
    configureServer(s) {
      serverContext = s;
    },
    resolveId(id) {
      if (id === CLIENT_PUBLIC_PATH) {
        return { id };
      }
      return null;
    },
    async load(id) {
      if (id === CLIENT_PUBLIC_PATH) {
        // client 脚本的真实路径
        const realPath = path.join(
          serverContext.root,
          'node_modules',
          'mini-vite',
          'dist',
          'client.mjs'
        );

        const code = await fs.readFile(realPath, 'utf-8');

        return {
          // 替换占位符
          code: code.replace('__HMR_PORT__', JSON.stringify(HMR_PORT)),
        };
      }
    },
    transformIndexHtml(raw) {
      // 插入客户端脚本
      // 在 head 标签后面加上 <script type="module" src="/@vite/client"></script>
      return raw.replace(
        /(<head[^>]*>)/i,
        `$1<script type="module" src="${CLIENT_PUBLIC_PATH}"></script>`
      );
    },
  };
}
