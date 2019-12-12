import { find, isUndefined, map } from 'lodash'

import { getMonorepoDetectors } from '../model/monorepos'

// helpers for determining package structure (monorepo vs. single package, root directories, etc)

export interface ProjectStructure {
  /**
   * true if we are inside a monorepo, otherwise false
   */
  isMonorepo: boolean

  /**
   * Detected project root directory. In a monorepo, this is the monorepo root. In a single package,
   * this is the same as the package dir.
   */
  rootDir: string

  /**
   * All detected package directories. In a monorepo, this will be the combination of all packages in
   * all package globs. In a non-monorepo, this will be a single-entry array containing the package
   * directory (which will be the same as rootDir).
   */
  packageDirs: string[]
}

export const getProjectStructure = (fromDirectory = process.cwd()) => {
  return Promise
    .all(map(getMonorepoDetectors(), (detector) => detector(fromDirectory)))
    .then((results) => find(results, (result) => !isUndefined(result)))
    .then((monorepo) => isUndefined(monorepo) 
      ? { isMonorepo: false } 
      : {
        isMonorepo: true,
        ...monorepo,
      })
}