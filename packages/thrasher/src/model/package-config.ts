import path from 'path'
import fs from 'fs'

import { isUndefined } from 'lodash'

import { loadJson } from '../structure/directory-walker'

import { PackageJson, validatePackageJson } from './npm-package-json'

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
  }

  public readFile = (packageRelativePath: string): Promise<string> => new Promise((resolve, reject) => {
    fs.readFile(path.join(this.directory, packageRelativePath), 'utf8', (error, data) => {
      if (isUndefined(error)) {
        resolve(data.toString())
      } else {
        reject(error)
      }
    })
  })

  public readJsonFile = (packageRelativePath: string): Promise<object> => {
    return this.readFile(packageRelativePath)
      .then((fileContents) => JSON.parse(fileContents))
      .catch((err) => {
        if (err instanceof SyntaxError) {
          throw new Error(`File '${packageRelativePath}' does not contain valid JSON. (In package: ${this.directory})`)
        }
        throw err
      })
  }
}

export const createPackageConfigFactory: PackageConfigFactoryFactory = () => ({
  createPackageConfig: (packageDirectory: string) => PackageConfig.create(packageDirectory),
})