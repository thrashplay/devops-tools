import { isNil } from 'lodash'

import { ProjectStructure } from '../model/project-structure'

import { execute as lernaRootDetector } from './root-detector-lerna'
import { execute as topmostPackageRootDetector } from './root-detector-topmost-package'

/**
 * Strategy for determining the structure of a project, given a directory (root or subdirectory)
 * from inside that project.
 *
 * If this strategy is able to determine the project structure for the directory, returns a
 * Promise that resolves to the project's structure. If this strategy is unable to do so,
 * the promise will resolve to `undefined`.
 */
export type ProjectStructureStrategy = (initialDirectory: string) => Promise<ProjectStructure | undefined>

////////////////////
// deprecated
////////////////////

/**
 * For a given package directory, returns a promise to resolve the project root directory for
 * for the package. If this locator cannot determine the project root, undefined will be
 * returned.
 */
export type RootDirectoryLocator = (initialDirectory: string) => Promise<string | undefined>

/**
 * For a given directory, returns a promise to resolve the ProjectStructure 
 * for the project with that as a root direcotry. If the project is not of a type recognized
 * by this function, then undefined will be resolved.
 */
export type ProjectStructureInitializer = (rootDirectory: string) => Promise<ProjectStructure | undefined>

export interface ProjectStructureFactoryOptions {
  rootDirectoryLocators?: RootDirectoryLocator[]
  projectStructureInitializers?: ProjectStructureInitializer[]
}
export const createProjectStructureFactory = ({
  rootDirectoryLocators = [],
  projectStructureInitializers = [],
}: ProjectStructureFactoryOptions = {}) => {
  const findRootDirectory = async (initialDirectory: string) => {
    for (let rootDirectoryLocator of rootDirectoryLocators) {
      const rootDirectory = await rootDirectoryLocator(initialDirectory)
      if (!isNil(rootDirectory)) {
        return rootDirectory
      }
    }
    return undefined
  }

  const initializeProjectStructure = async (rootDirectory: string) => {
    for (let initializer of projectStructureInitializers) {
      const projectStructure = await initializer(rootDirectory)
      if (!isNil(projectStructure)) {
        return projectStructure
      }
    }
    return undefined
  }

  return {
    createProjectStructure: async (initialDirectory: string) => {
      return Promise.resolve(initialDirectory)
        .then(findRootDirectory)
        .then((rootDirectory) => {
          return isNil(rootDirectory) 
            ? Promise.reject(new Error(`Cannot find project root for directory: ${initialDirectory}`))
            : initializeProjectStructure(rootDirectory)
        })
        .then((projectStructure) => {
          return isNil(projectStructure)
            ? Promise.reject(new Error(`Project root does not match any known project structure: ${initialDirectory}`))
            : projectStructure
        })
    },
  }
}

export const defaultProjectStructureFactory = createProjectStructureFactory({
  rootDirectoryLocators: [lernaRootDetector, topmostPackageRootDetector],
})