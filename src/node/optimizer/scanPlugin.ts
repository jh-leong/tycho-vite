import { Plugin } from 'esbuild';
import { BARE_IMPORT_RE, EXTERNAL_TYPES } from '../constants';

export function scanPlugin(deps: Set<string>): Plugin {
  return {
    name: 'esbuild:scan-deps',
    setup(build) {
      /** 
       * 1. 忽略的文件类型, 这些类型的文件不会被记录依赖, 防止 esbuild 报错
       */
      build.onResolve(
        { filter: new RegExp(`\\.(${EXTERNAL_TYPES.join('|')})$`) },
        (resolveInfo) => {
          return {
            path: resolveInfo.path,
            // 打上 external 标记
            external: true,
          };
        }
      );

      /**
       * 2. 扫描 bare import, 记录依赖
       */
      build.onResolve(
        {
          filter: BARE_IMPORT_RE,
        },
        (resolveInfo) => {
          const { path: id } = resolveInfo;

          // 推入 deps 集合中
          deps.add(id);

          return {
            path: id,
            external: true,
          };
        }
      );
    },
  };
}
