import { NextHandleFunction } from 'connect';
import { isImportRequest } from '../../utils';
import sirv from 'sirv';

export function staticMiddleware(root: string): NextHandleFunction {
  const serveFromRoot = sirv(root, { dev: true });

  return async (req, res, next) => {
    if (!req.url) {
      return;
    }
    if (isImportRequest(req.url)) {
      return;
    }
    serveFromRoot(req, res, next);
  };
}
