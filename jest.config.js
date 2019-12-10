const path = require('path')
const fs = require('fs')

const glob = require('glob')
const { pathsToModuleNameMapper } = require('ts-jest/utils')
const { concat, map, reduce } = require('lodash')

const { compilerOptions } = require('./tsconfig')

const readJsonFile = (file) => {
  return JSON.parse(fs.readFileSync(file))
}

const addTrailingSlashIfMissing = (path) => {
  return path.replace(/\/?$/, '/')
}

const createPackageFromDir = (dir) => {
  const packageJson = require(path.resolve(dir, 'package.json'))

  return {
    displayName: packageJson.name,
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: addTrailingSlashIfMissing(path.resolve(dir, '..')) }),
    rootDir: dir,
    testPathIgnorePatterns: [
      'dist',
      'node_modules',
    ],
  }
}

const lernaConfig = readJsonFile('lerna.json')
const packageDirs = reduce(lernaConfig.packages, (directoryList, globPattern) => {
  return concat(directoryList, glob.sync(globPattern))
}, [])


module.exports = {
  automock: false,
  bail: false,
  collectCoverageFrom: [
    '**/*.{ts,tsx,js,jsx}',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  // coverage?
  projects: map(packageDirs, createPackageFromDir),
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    'dist',
    'node_modules',
  ],
}