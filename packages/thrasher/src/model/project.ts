import path from 'path'

import fs from 'fs-extra'
import { defaultTo, find, isEqual, isNil, isUndefined, map } from 'lodash'

import { createProjectStructure as standalone } from '../structure/create-project-standalone'
import { createProjectStructure as lerna } from '../structure/create-project-lerna'

import { createPackageConfigFactory, PackageConfigFactory } from './package-config'
import { PackageConfig } from './package-config'

export interface ProjectFactory {
  createProject: (fromDir: string) => Promise<Project>
}

export interface ProjectFactoryOptions {
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

  /**
   * Reads a file, relative to the project's root directory.
   */
  public readFile = (projectRelativePath: string) => {
    return fs.readFile(path.resolve(this.projectRootDir, projectRelativePath), 'utf8')
  }

  /**
   * Reads a file, relative to the project's root directory, and attempts to parse it as JSON.
   * Will reject the promise if the specified path is not a valid JSON file.
   */
  public readJsonFile = (packageRelativePath: string) => this.readFile(packageRelativePath)
    .then((fileContents) => JSON.parse(fileContents))
    .catch((err) => {
      if (err instanceof SyntaxError) {
        throw new Error(`File '${packageRelativePath}' does not contain valid JSON. (In package: ${this.directory})`)
      }
      throw err
    })
}

const getProjectStructure = async (fromDirectory = process.cwd()) => {
  const strategies = [lerna, standalone]

  for (let strategy of strategies) {
    const structure = await strategy(fromDirectory)
    if (!isNil(structure)) {
      return structure
    }
  }

  return undefined
}

export const createProjectFactory = ({
  packageConfigFactory = createPackageConfigFactory(),
}: ProjectFactoryOptions = {}): ProjectFactory => ({
  createProject: (initialDir: string) => {
    return getProjectStructure(initialDir)
      .then((projectStructure) => {
        if (isNil(projectStructure)) {
          return Promise.reject('Unable to recognize project structure.')
        } else {
          const packageDirs = defaultTo(projectStructure.packageDirectories, [])
          const packagePromises = map(packageDirs, (packageDir) => {
            console.log('creating package config:', packageDir)
            return packageConfigFactory.createPackageConfig(packageDir)
          })
          return Promise.all(packagePromises)
            .then((packages) => new Project(initialDir, projectStructure.isMonorepo, projectStructure.rootDirectory, packages))
        }
      })
  },
})