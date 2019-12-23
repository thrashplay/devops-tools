import path from 'path'

import { replace } from 'lodash'

/**
 * Replaces '/' and '\' characters in the path with the path separator for the current system.
 */
export const normalizePath = (pathString: string, makeAbsolute = true) => {
  const normalized = replace(pathString, /[/\\]/g, path.sep)
  return makeAbsolute ? path.resolve(normalized) : normalized
}