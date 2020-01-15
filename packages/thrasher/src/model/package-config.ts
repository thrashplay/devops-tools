import path from 'path'

import { loadJson } from '../structure/directory-walker'

import { PackageJson, validatePackageJson } from './npm-package-json'
import { IoHelper } from './io-helper'

export interface PackageConfigFactory {
  createPackageConfig: (packageDirectory: string) => Promise<PackageConfig>
}
export type PackageConfigFactoryFactory = () => PackageConfigFactory

const loadPackageConfig = (directory: string) => 
  Promise.all([directory, loadJson(path.join(directory, 'package.json'))])
    .catch((err) => {
      if (err instanceof SyntaxError) {
        throw new Error(`Invalid package.json format: ${directory}/package.json`)
      }
      throw err
    })

const validatePackageConfig = ([directory, unvalidatedPackageJson]: [string, any]) => 
  Promise.resolve()
    .then(() => validatePackageJson(unvalidatedPackageJson))
    .catch(() => Promise.reject(new Error(`Invalid package.json JSON structure: ${directory}/package.json`)))

/**
 * Encapsulates configuration and metadata for a single package in a project, and also provides
 * read/write access to the files in that package.
 */
export class PackageConfig {
  private readonly ioHelper: IoHelper
  
  /**
   * Static factory function for creating packages for a directory. The directory must contain
   * a `package.json` file.
   */
  public static create = (directory: string): Promise<PackageConfig> => {
    return Promise.resolve(directory)
      .then(loadPackageConfig)
      .then(validatePackageConfig)
      .then((validatedPackageJson) => new PackageConfig(directory, validatedPackageJson))
  }

  public readonly name: string
  public constructor(public readonly directory: string, public readonly packageJson: PackageJson) { 
    this.name = this.packageJson.name
    this.ioHelper = new IoHelper(this.directory)
  }

  /**
   * 
   */
  public pathExists = (packageRelativePath: string) => this.ioHelper.pathExists(packageRelativePath)

  /**
   * Reads a file, relative to the package's root directory.
   */
  public readFile = (packageRelativePath: string) => this.ioHelper.readFile(packageRelativePath)

  /**
   * Reads a file, relative to the package's root directory, and attempts to parse it as JSON.
   * Will reject the promise if the specified path is not a valid JSON file.
   */
  public readJsonFile = (packageRelativePath: string) => this.ioHelper.readJsonFile(packageRelativePath)

  /**
   * Writes a file, relative to the package's root directory. If the directory tree containing the file
   * does not exist, it will be created.
   */
  public writeFile = (packageRelativePath: string, contents: string) => {
    return this.ioHelper.writeFile(packageRelativePath, contents)
  }

  /**
   * Writes a value as JSON into a file, relative to the package's root directory. If the directory 
   * tree containing the file  does not exist, it will be created.
   */
  public writeJsonFile = (packageRelativePath: string, contents: any) => {
    return this.ioHelper.writeJsonFile(packageRelativePath, contents)
  }
}

export const createPackageConfigFactory: PackageConfigFactoryFactory = () => ({
  createPackageConfig: (packageDirectory: string) => PackageConfig.create(packageDirectory),
})