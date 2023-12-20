import { Plugin } from '../plugin';
import { assetPlugin } from './asset';
import { clientInjectPlugin } from './clientInject';
import { cssPlugin } from './css';
import { esbuildTransformPlugin } from './esbuild';
import { importAnalysisPlugin } from './importAnalysis';
import { resolvePlugin } from './resolve';

export function resolvePlugins(): Plugin[] {
  return [
    clientInjectPlugin(),
    resolvePlugin(),
    esbuildTransformPlugin(),
    importAnalysisPlugin(),
    cssPlugin(),
    assetPlugin(),
  ];
}
