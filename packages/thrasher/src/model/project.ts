import { find, get, isEqual, isUndefined, map } from 'lodash'

import { getMonorepoDetectors, MonorepoDetector, Monorepo } from './monorepos'
import { createPackageConfigFactory, PackageConfigFactory } from './package-config'
import { PackageConfig } from './package-config'



/**
 * Function that locates the project root for a specified directory, returning a
 * promise to resolve the corresponding AbstractProjectRoot.
 */
export type ProjectRootLocator = (directory: string) => Promise<AbstractProjectRoot>

export interface ProjectFactory {
  createProject: (fromDir: string) => Promise<Project>
}

export interface ProjectFactoryOptions {
  monorepoDetectors?: MonorepoDetector[],
  packageConfigFactory?: PackageConfigFactory,
}

export class Project {
  constructor(
    /** initial directory (cwd) of the build */
    readonly initialDir: string,
    
    /** true if the project is a monorepo */
    readonly isMonorepo: boolean,
    
    /** root directory of the project's monorepo, or the standalone direcotry */
    readonly projectRootDir: string,

    /** list of all packages in the project (will be single package if standalone) */
    readonly packages: PackageConfig[],
  ) { 
    if (!isMonorepo && !this.isProjectRoot(this.initialDir)) {
      throw new Error('For standalone projects, the initialDir must equal the projectRootDir.')
    }
  }

  getPackageFromDir = (directory: string) => {
    return find(this.packages, { directory })
  }

  isProjectRoot = (directory: string) => isEqual(this.projectRootDir, directory)

  get packagesToBuild() {
    const getSinglePackageAsArray = (directory: string) => {
      const pkg = this.getPackageFromDir(directory)
      return isUndefined(pkg) ? [] : [pkg]
    }

    return this.isMonorepo && this.isProjectRoot(this.initialDir)
      ? this.packages
      : getSinglePackageAsArray(this.initialDir)
  }
}

const getProjectStructure = (fromDirectory = process.cwd(), monorepoDetectors: MonorepoDetector[] = []) => {
  const createStandaloneStructure = () => ({
    isMonorepo: false,
    rootDir: fromDirectory,
    packageDirs: [fromDirectory],
  })
  const createMonorepoStructure = (monorepo: Monorepo) => ({
    isMonorepo: true,
    ...monorepo,
  })

  return Promise
    .all(map(monorepoDetectors, (detector) => detector(fromDirectory)))
    .then((results) => find(results, (result) => !isUndefined(result)))
    .then((monorepo) => isUndefined(monorepo) 
      ? createStandaloneStructure()
      : createMonorepoStructure(monorepo))
}

export const createProjectFactory = ({
  monorepoDetectors = getMonorepoDetectors(),
  packageConfigFactory = createPackageConfigFactory(),
}: ProjectFactoryOptions = {}): ProjectFactory => ({
  createProject: (initialDir: string) => {
    return getProjectStructure(initialDir, monorepoDetectors)
      .then((projectStructure) => {
        const packageDirs = get(projectStructure, 'packageDirs', [])
        const packagePromises = map(packageDirs, (packageDir) => packageConfigFactory.createPackageConfig(packageDir))

        return Promise.all(packagePromises)
          .then((packages) => new Project(initialDir, projectStructure.isMonorepo, projectStructure.rootDir, packages))
      })
  },
})