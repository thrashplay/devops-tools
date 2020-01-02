import path from 'path'
import { promises as fs } from 'fs'

import { has, merge } from 'lodash'

import { Project, PackageConfig } from '../../model'

import { BuildConfiguration, PackageBuildStep } from './build-step'

//////////
// It is an error if tsconfig.json declares any of the following:
//
// "baseUrl": "<anything>",
// "composite": false,
// "declaration": false,
// "isolatedModules": false,
// "module": NOT "es6", ??
// "noEmit": false,
// "noEmitOnError": false,
// "paths": any
//////////

const rootTsConfig = {
  extends: './tsconfig.json',
  compilerOptions: {
    baseUrl: '.',
    composite: true,
    declaration: true,
    isolatedModules: true,
    module: 'es6',
    noEmit: true,
    noEmitOnError: true,
  },
}

const baseTsconfig = {
  extends: '../../tsconfig.json',
  compilerOptions: {
    declarationDir: './dist/module',
    outDir: './dist/module',
    rootDir: './src',
  },
  include: ['src'],
}

// maps the named package dependency to a local Typescript reference
// returns undefined if no such reference is needed
// const mapDependencyToTypescriptReference = (dependencyName: string) => {
//   return dependencyName.startsWith('@thrashplay/')
//     ? replace(dependencyName, '@thrashplay/', '')
//     : undefined
// }

// const readJsonFile = (file: string) => {
//   return JSON.parse(fs.readFileSync(file).toString())
// }

class CreatePackageTsConfigBuildStep extends PackageBuildStep {
  protected beforePackages = (_configuration: BuildConfiguration, project: Project) => {
    const assertCompilerOptionNotSet = (userBaseTsConfig: object, property: string) => {
      if (has(userBaseTsConfig, property)) {
        throw new Error(`The tsconfig.json option '${property}' cannot be set, because it will be overridden by Thrasher.`)
      }
    }

    return project.readJsonFile('tsconfig.json')
      .then((tsconfig) => {
        assertCompilerOptionNotSet(tsconfig, 'baseUrl')
        assertCompilerOptionNotSet(tsconfig, 'composite')
        assertCompilerOptionNotSet(tsconfig, 'declaration')
        assertCompilerOptionNotSet(tsconfig, 'isolatedModules')
        assertCompilerOptionNotSet(tsconfig, 'module')
        assertCompilerOptionNotSet(tsconfig, 'noEmit')
        assertCompilerOptionNotSet(tsconfig, 'noEmitOnError')
        assertCompilerOptionNotSet(tsconfig, 'paths')
        return true
      })
      .catch((err) => {
        if (err instanceof SyntaxError) {
          // invalid JSON found, this is a real error
          throw err
        }

        // assume file could not be opened, so we indicate there was none
        return false
      })
      .then((tsconfigExists) => {
        const config = merge(
          {},
          rootTsConfig,
          tsconfigExists ? { extends: '../tsconfig.json' } : {},
        )

        return fs.mkdir(path.resolve(project.projectRootDir, '.thrasher'), { recursive: true })
          .then(() => fs.writeFile(path.resolve(project.projectRootDir, '.thrasher', 'tsconfig.json'), JSON.stringify(config)))
          .then(() => true)
      })

  }

  protected executeForPackage(_configuration: BuildConfiguration, _project: Project, pkg: PackageConfig) {
    // const packageJson = pkg.packageJson
    // const references = chain(packageJson.dependencies)
    //   .map((_version, name) => name)
    //   .map(mapDependencyToTypescriptReference)
    //   .filter((reference) => !isUndefined(reference))
    //   .map((reference) => ({ path: `../${reference}` }))
    //   .value()

    const finalTsConfig = {
      ...baseTsconfig,
    //   references,
    }

    return fs.writeFile(path.resolve(pkg.directory, 'tsconfig.json'), JSON.stringify(finalTsConfig, null, 2))
    // return Promise.resolve()
  }
}

export const create = (): PackageBuildStep => new CreatePackageTsConfigBuildStep()
