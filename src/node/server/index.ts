import connect from 'connect';
import { blue, green } from 'picocolors';
import { optimize } from '../optimizer';

import { resolvePlugins } from '../plugins';
import { createPluginContainer, PluginContainer } from '../pluginContainer';
import { Plugin } from '../plugin';
import { indexHtmlMiddleware } from './middlewares/indexHtml';
import { transformMiddleware } from './middlewares/transform';
import { staticMiddleware } from './middlewares/static';
import { ModuleGraph } from '../moduleGraph';

export interface ServerContext {
  root: string;
  pluginContainer: PluginContainer;
  app: connect.Server;
  plugins: Plugin[];
  moduleGraph: ModuleGraph;
}

export async function startDevServer() {
  const app = connect();
  const root = process.cwd();
  const startTime = Date.now();

  const plugins = resolvePlugins();
  const pluginContainer = createPluginContainer(plugins);
  const moduleGraph = new ModuleGraph((url) => pluginContainer.resolveId(url));

  const serverContext: ServerContext = {
    root,
    app,
    pluginContainer,
    plugins,
    moduleGraph,
  };

  for (const plugin of plugins) {
    if (plugin.configureServer) {
      await plugin.configureServer(serverContext);
    }
  }

  app.use(indexHtmlMiddleware(serverContext));
  app.use(transformMiddleware(serverContext));
  app.use(staticMiddleware(root));

  app.listen(3000, async () => {
    await optimize(root);

    console.log(
      green('🚀 No-Bundle 服务已经成功启动!'),
      `耗时: ${Date.now() - startTime}ms`
    );
    console.log(`> 本地访问路径: ${blue('http://localhost:3000')}`);
  });
}
