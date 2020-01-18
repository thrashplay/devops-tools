import path from 'path'
import { promises as fs } from 'fs'

import { chain, concat, find, get, has, isEmpty, isNil, isUndefined, merge, negate, replace } from 'lodash'

import { Project, PackageConfig } from '../../model'

import { BuildConfiguration, PackageBuildStep } from './build-step'

//////////
// It is an error if the user-provided tsconfig.json declares any of the following:
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

const basePackageTsConfig = {
  compilerOptions: {
    declarationDir: '../lib',
    outDir: '../lib',
    rootDir: '../src',
  },
  include: ['../src'],
}

/**
 * Converts a path to a format suitable for a tsconfig file, by replacing all directory separators with '/'
 */
const toTsConfigSeparators = (path: string) => replace(path, /\\/g, '/')

/**
 * Gets the correct tsconfig `extends` path for the specified package.
 * 
 * For a monorepo, if there is a user-provided, package-local 'tsconfig.json' file, then the extends path will 
 * extend that. If there is no such file, then the extends path will extend the monorepo project root's Thrasher 
 * tsconfig.json.
 * 
 * TODO: For a standalone project, TBD
 */
const getExtendsPathForPackage = (project: Project, packageConfig: PackageConfig) => {
  const packageThrasherDir = path.join(packageConfig.directory, '.thrasher')
  const projectThrasherDir = path.join(project.projectRootDir, '.thrasher')
  const packageRelativeDir = path.relative(packageThrasherDir, packageConfig.directory)
  const projectRelativeDir = path.relative(packageThrasherDir, projectThrasherDir)

  return packageConfig.pathExists('tsconfig.json')
    ? toTsConfigSeparators(path.join(packageRelativeDir, 'tsconfig.json'))
    : toTsConfigSeparators(path.join(projectRelativeDir, 'tsconfig.json'))
}

const getReferencesForPackage = (project: Project, packageConfig: PackageConfig) => {
  const mapNameToPackageFromProject = (dependencyName: string) => find(project.packages, (packageConfig) => packageConfig.name === dependencyName)

  const createReferenceForPackage = (otherPackage: PackageConfig) => {
    const currentConfigDirectory = path.join(packageConfig.directory, '.thrasher')
    const dependencyConfigDirectory = path.join(otherPackage.directory, '.thrasher')
    return {
      path: toTsConfigSeparators(path.relative(currentConfigDirectory, dependencyConfigDirectory)),
    }
  }

  const references = chain(packageConfig.packageJson.dependencies)
    .map((_version, name) => name)
    .map(mapNameToPackageFromProject)
    .filter(negate(isUndefined))
    .map(createReferenceForPackage)
    .value()

  return isEmpty(references) ? undefined : references
}

class CreatePackageTsConfigBuildStep extends PackageBuildStep {
  protected beforePackages = (_configuration: BuildConfiguration, project: Project) => {
    return project.readJsonFile('tsconfig.json')
      .catch((err) => {
        if (err instanceof SyntaxError) {
          // invalid JSON found, this is a real error
          throw err
        }

        // assume file could not be opened, so we indicate there was none
        return null
      })
      .then((tsconfig) => {
        if (!isNil(tsconfig)) {
          this.assertNoForbiddenProperties(path.resolve(project.projectRootDir, 'tsconfig.json'), tsconfig)
        }
        
        const config = merge(
          {},
          rootTsConfig,
          project.isMonorepo ? {} : basePackageTsConfig,          // standalone packages include package-specific config in their 'root'
          isNil(tsconfig) ? {} : { extends: '../tsconfig.json' },
        )

        return fs.mkdir(path.resolve(project.projectRootDir, '.thrasher'), { recursive: true })
          .then(() => Promise.all(concat(
            project.writeJsonFile(path.join('.thrasher', 'tsconfig.json'), config),
          )))
          .then(() => true)
      })
  }

  protected executeForPackage(_configuration: BuildConfiguration, project: Project, packageConfig: PackageConfig) {
    const assertExtendsIsValid = (tsconfigPath: string, tsconfig: object) => {
      const packageTsconfigDirectory = path.resolve(packageConfig.directory, '.thrasher')
      const rootTsconfigFile = path.resolve(project.projectRootDir, '.thrasher', 'tsconfig.json')
      const requiredPath = path.relative(packageTsconfigDirectory, rootTsconfigFile)
      const requiredValue = toTsConfigSeparators(requiredPath)

      if (get(tsconfig, 'extends') !== requiredValue) {
        throw new Error(`Error in ${tsconfigPath}: The 'extends' option must be set, and must reference the Thrasher-generated root configuration: ${requiredValue}.`)
      }
    }

    // todo: refactor the duplicated parsing/error handling code
    return packageConfig.readJsonFile('tsconfig.json')
      .catch((err) => {
        if (err instanceof SyntaxError) {
          // invalid JSON found, this is a real error
          throw err
        }

        // assume file could not be opened, so we indicate there was none
        return null
      })
      .then((tsconfig) => {
        // standalone projects (not monorepos) have no package-specific configuration files
        if (!project.isMonorepo) {
          return Promise.resolve()
        }

        if (!isNil(tsconfig)) {
          this.assertNoForbiddenProperties(path.resolve(packageConfig.directory, 'tsconfig.json'), tsconfig)
          assertExtendsIsValid(path.resolve(packageConfig.directory, 'tsconfig.json'), tsconfig)
        }
        
        const packageTsConfig = merge(
          {},
          basePackageTsConfig,
          { 
            extends: getExtendsPathForPackage(project, packageConfig),
            references: getReferencesForPackage(project, packageConfig),
          },
        )
    
        return packageConfig.writeJsonFile(path.join('.thrasher', 'tsconfig.json'), packageTsConfig)
      })
  }

  private assertNoForbiddenProperties = (tsconfigPath: string, tsconfig: object) => {
    const assertCompilerOptionNotSet = (userBaseTsConfig: object, property: string) => {
      if (has(userBaseTsConfig, property)) {
        throw new Error(`Error in ${tsconfigPath}: The tsconfig.json option '${property}' cannot be set, because it will be overridden by Thrasher.`)
      }
    }

    assertCompilerOptionNotSet(tsconfig, 'baseUrl')
    assertCompilerOptionNotSet(tsconfig, 'composite')
    assertCompilerOptionNotSet(tsconfig, 'declaration')
    assertCompilerOptionNotSet(tsconfig, 'declarationDir')
    assertCompilerOptionNotSet(tsconfig, 'isolatedModules')
    assertCompilerOptionNotSet(tsconfig, 'module')
    assertCompilerOptionNotSet(tsconfig, 'noEmit')
    assertCompilerOptionNotSet(tsconfig, 'noEmitOnError')
    assertCompilerOptionNotSet(tsconfig, 'outDir')
    assertCompilerOptionNotSet(tsconfig, 'paths')
    assertCompilerOptionNotSet(tsconfig, 'rootDir')
  }
}

export const create = (): PackageBuildStep => new CreatePackageTsConfigBuildStep()
