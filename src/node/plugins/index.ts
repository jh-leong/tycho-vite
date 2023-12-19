import { Plugin } from '../plugin';
import { cssPlugin } from './css';
import { esbuildTransformPlugin } from './esbuild';
import { importAnalysisPlugin } from './importAnalysis';
import { resolvePlugin } from './resolve';

export function resolvePlugins(): Plugin[] {
  return [
    resolvePlugin(),
    esbuildTransformPlugin(),
    importAnalysisPlugin(),
    cssPlugin(),
  ];
}
