import { PartialResolvedId, TransformResult } from 'rollup';
import { cleanUrl } from './utils';

export class ModuleNode {
  // 资源访问 url
  url: string;
  // 资源绝对路径, url 解析后的结果
  id: string | null = null;
  importers = new Set<ModuleNode>();
  importedModules = new Set<ModuleNode>();
  transformResult: TransformResult | null = null;
  lastHMRTimestamp = 0;

  constructor(url: string) {
    this.url = url;
  }
}

export class ModuleGraph {
  idToModuleMap = new Map<string, ModuleNode>();
  urlToModuleMap = new Map<string, ModuleNode>();

  constructor(
    private resolveId: (url: string) => Promise<PartialResolvedId | null>
  ) {}

  getModuleById(id: string): ModuleNode | undefined {
    return this.idToModuleMap.get(id);
  }

  async getModuleByUrl(rawUrl: string): Promise<ModuleNode | undefined> {
    const { url } = await this._resolve(rawUrl);
    return this.urlToModuleMap.get(url);
  }

  async ensureEntryFromUrl(rawUrl: string): Promise<ModuleNode> {
    const { url, resolvedId } = await this._resolve(rawUrl);

    // 有缓存
    if (this.urlToModuleMap.has(url)) {
      return this.urlToModuleMap.get(url) as ModuleNode;
    }

    // 无缓存
    const mod = new ModuleNode(url);
    mod.id = resolvedId;

    this.urlToModuleMap.set(url, mod);
    this.idToModuleMap.set(resolvedId, mod);

    return mod;
  }

  async updateModuleInfo(
    mod: ModuleNode,
    importedModules: Set<string | ModuleNode>
  ) {
    const prevImports = mod.importedModules;

    const nextImportedModules = new Set<ModuleNode>();

    for (const curImports of importedModules) {
      const dep =
        typeof curImports === 'string'
          ? await this.ensureEntryFromUrl(cleanUrl(curImports))
          : curImports;

      if (dep) {
        nextImportedModules.add(dep);
        dep.importers.add(mod);
      }
    }

    mod.importedModules = nextImportedModules;

    // 对 prevImports 中的不在被引用的 ModuleNode, 移除 importer
    for (const prevImport of prevImports) {
      if (importedModules.has(prevImport.url)) continue;
      prevImport.importers.delete(mod);
    }
  }

  invalidateModule(file: string) {
    const mod = this.idToModuleMap.get(file);

    if (mod) {
      mod.lastHMRTimestamp = Date.now();
      mod.transformResult = null;
      mod.importers.forEach((importer) => {
        this.invalidateModule(importer.id!);
      });
    }
  }

  private async _resolve(
    url: string
  ): Promise<{ url: string; resolvedId: string }> {
    const resolved = await this.resolveId(url);
    const resolvedId = resolved?.id || url;
    return { url, resolvedId };
  }
}
