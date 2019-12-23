import path from 'path'

import { intersection, last, map } from 'lodash'

import { createDirectoryWalker } from './directory-walker'

import { RootDirectoryLocator } from '.'

const convertToDirectories = (paths: string[]) => map(paths, (pathString) => path.dirname(pathString))

/**
 * Determines the project root by walking up the file system, and locating the topmost
 * directory that contains both a 'lerna.json' file and a 'package.json' file. Returns 
 * undefined if no directories in the hierarchy, including the initial directory, have 
 * both of these files.
 */
export const execute: RootDirectoryLocator = (initialDirectory: string) => {
  const walker = createDirectoryWalker(initialDirectory)
  return Promise.all([
    walker.findAllFiles('lerna.json'),
    walker.findAllFiles('package.json'),
  ]).then(([lernaPaths, packageJsonPaths]) => [convertToDirectories(lernaPaths), convertToDirectories(packageJsonPaths)])
    .then(([lernaDirs, packageJsonDirs]) => intersection(lernaDirs, packageJsonDirs))
    .then((pathsWithBoth) => last(pathsWithBoth))
}