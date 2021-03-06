import { find, get, isEqual, isUndefined, map } from 'lodash'

import { getMonorepoDetectors, MonorepoDetector, Monorepo } from './monorepos'
import { createPackageMetadataFactory, PackageMetadataFactory } from './package-metadata'
import { PackageMetadata } from './package-metadata'

export interface ProjectFactory {
  createProject: (fromDir: string) => Promise<Project>
}

export interface ProjectFactoryOptions {
  monorepoDetectors?: MonorepoDetector[],
  packageMetadataFactory?: PackageMetadataFactory,
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
    readonly packages: PackageMetadata[],
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
  packageMetadataFactory = createPackageMetadataFactory(),
}: ProjectFactoryOptions = {}): ProjectFactory => ({
  createProject: (initialDir: string) => {
    return getProjectStructure(initialDir, monorepoDetectors)
      .then((projectStructure) => {
        const packageDirs = get(projectStructure, 'packageDirs', [])
        const metadataPromises = map(packageDirs, (packageDir) => packageMetadataFactory.createPackageMetadata(packageDir))

        return Promise.all(metadataPromises)
          .then((packages) => new Project(initialDir, projectStructure.isMonorepo, projectStructure.rootDir, packages))
      })
  },
})