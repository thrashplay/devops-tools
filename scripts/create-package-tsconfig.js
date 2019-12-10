#!/usr/bin/env node
'use strict'

const fs = require('fs')

const { chain, isUndefined, replace } = require('lodash')

const baseTsconfig = {
  extends: '../../tsconfig.json',
  compilerOptions: {
    declarationDir: './dist',
    outDir: './dist',
    rootDir: './src',
  },
}

const readJsonFile = (file) => {
  return JSON.parse(fs.readFileSync(file))
}

// maps the named package dependency to a local Typescript reference
// returns undefined if no such reference is needed
const mapDependencyToTypescriptReference = (dependencyName) => {
  return dependencyName.startsWith('@thrashplay/')
    ? replace(dependencyName, '@thrashplay/', '')
    : undefined
}

const packageJson = readJsonFile('package.json')

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

fs.writeFileSync('tsconfig.json', JSON.stringify(finalTsConfig))