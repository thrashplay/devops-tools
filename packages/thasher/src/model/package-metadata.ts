import path from 'path'

import { loadJson } from '../fs/file-utils'

export interface PackageMetadataFactory {
  createPackageMetadata: (packageDirectory: string) => Promise<PackageMetadata>
}
export type PackageMetadataFactoryFactory = () => PackageMetadataFactory

export interface PackageJson {
  name: string
}

export interface PackageMetadata {
  directory: string
  name: string
  config: PackageJson
}

export const createPackageMetadataFactory: PackageMetadataFactoryFactory = () => ({
  createPackageMetadata: (packageDirectory: string) => {
    const packageJsonPath = path.join(packageDirectory, 'package.json')
    return loadJson(packageJsonPath)
      .then((loadedConfig) => {
        const packageJson = loadedConfig as PackageJson
        // todo: validate metadata schema
        
        return {
          config: packageJson,
          directory: packageDirectory,
          name: packageJson.name,
        } as PackageMetadata
      })
  },
})