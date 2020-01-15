import { defaultTo, find, isEqual, isNil, isUndefined, map } from 'lodash'

import { createProjectStructure as standalone } from '../structure/create-project-standalone'
import { createProjectStructure as lerna } from '../structure/create-project-lerna'

import { createPackageConfigFactory, PackageConfigFactory } from './package-config'
import { PackageConfig } from './package-config'
import { IoHelper } from './io-helper'

export interface ProjectFactory {
  createProject: (fromDir: string) => Promise<Project>
}

export interface ProjectFactoryOptions {
  packageConfigFactory?: PackageConfigFactory,
}

export class Project {
  private readonly ioHelper: IoHelper

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

    this.ioHelper = new IoHelper(this.projectRootDir)
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
   * 
   */
  public pathExists = (projectRelativePath: string) => this.ioHelper.pathExists(projectRelativePath)

  /**
   * Reads a file, relative to the project's root directory.
   */
  public readFile = (projectRelativePath: string) => this.ioHelper.readFile(projectRelativePath)

  /**
   * Reads a file, relative to the project's root directory, and attempts to parse it as JSON.
   * Will reject the promise if the specified path is not a valid JSON file.
   */
  public readJsonFile = (projectRelativePath: string) => this.ioHelper.readJsonFile(projectRelativePath)

  /**
   * Writes a file, relative to the project's root directory. If the directory tree containing the file
   * does not exist, it will be created.
   */
  public writeFile = (projectRelativePath: string, contents: string) => {
    return this.ioHelper.writeFile(projectRelativePath, contents)
  }

  /**
   * Writes a value as JSON into a file, relative to the project's root directory. If the directory tree 
   * containing the file does not exist, it will be created.
   */
  public writeJsonFile = (projectRelativePath: string, contents: any) => {
    return this.ioHelper.writeJsonFile(projectRelativePath, contents)
  }
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