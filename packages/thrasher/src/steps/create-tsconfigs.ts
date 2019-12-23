import fs from 'fs'
import path from 'path'

import { chain, cloneDeep, each, isUndefined, replace } from 'lodash'

import { Project } from '../model'
import { loadJson } from '../structure/directory-walker'

import { BuildStep, BuildConfiguration } from './build-step'

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
const mapDependencyToTypescriptReference = (dependencyName: string) => {
  return dependencyName.startsWith('@thrashplay/')
    ? replace(dependencyName, '@thrashplay/', '')
    : undefined
}

const readJsonFile = (file: string) => {
  return JSON.parse(fs.readFileSync(file).toString())
}

export const generateRootTsConfig = (project: Project) => {
  return cloneDeep(rootTsConfig)
}

export const create = (): BuildStep => {
  return {
    execute: (_configuration: BuildConfiguration, project: Project) => {
      each(project.packagesToBuild, (pkg) => {
        const packageJson = pkg.packageJson
        const references = chain(packageJson.dependencies)
          .map((_version, name) => name)
          .map(mapDependencyToTypescriptReference)
          .filter((reference) => !isUndefined(reference))
          .map((reference) => ({ path: `../${reference}` }))
          .value()

        const finalTsConfig = {
          ...baseTsconfig,
          references,
        }
          
        fs.writeFileSync(path.join(pkg.directory, 'tsconfig.json'), JSON.stringify(finalTsConfig, null, 2))
      })

      return Promise.resolve(project)
    },
  }
}