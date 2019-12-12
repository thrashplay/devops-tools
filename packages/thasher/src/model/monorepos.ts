import path from 'path'

import { flatMap, get, isUndefined } from 'lodash'
import glob from 'glob'

import { createDirectoryWalker, loadJson } from '../fs/file-utils'

export type MonorepoDetector = (fromDirectory: string) => Promise<Monorepo | undefined>

export interface Monorepo {
  /**
   * Detected monorepo root directory.
   */
  rootDir: string

  /**
   * All packages included in the monorepo
   */
  packageDirs: string[]
}

/**
 * Detect a monorepo structure by looking for the 'lerna.json' config file.
 */
export const lerna = (fromDirectory: string): Promise<Monorepo | undefined> => {
  const loadJsonWithFilename = (filename?: string): Promise<{ filename?: string, contents?: object }> => isUndefined(filename)
    ? Promise.resolve({})
    : loadJson(filename).then((contents) => ({
      contents,
      filename,
    }))
  
  const createMonorepo = (filename?: string, contents?: object) => {
    if (isUndefined(filename)) {
      return undefined
    } else {
      const rootDir = path.dirname(filename)
      return {
        rootDir,
        packageDirs: flatMap(get(contents, 'packages', [] as string[]), (packageGlob) => glob.sync(packageGlob, { cwd: rootDir })),
      }
    }
  }

  return createDirectoryWalker(fromDirectory)
    .findFirstFile('lerna.json')
    .then((lernaConfigPath) => loadJsonWithFilename(lernaConfigPath))
    .then(({ filename, contents }) => createMonorepo(filename, contents))    
}

export const getMonorepoDetectors = () => [
  lerna,
]