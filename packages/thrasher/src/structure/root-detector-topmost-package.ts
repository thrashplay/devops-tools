import path from 'path'

import { isEmpty } from 'lodash'

import { createDirectoryWalker } from './directory-walker'

import { RootDirectoryLocator } from '.'

/**
 * Determines the project root by walking up the file system, and locating the topmost
 * directory that contains a 'package.json' file. Returns undefined if no directories
 * in the hierarchy, including the initial directory, have a package.json
 */
export const execute: RootDirectoryLocator = (initialDirectory: string) => {
  return createDirectoryWalker(initialDirectory).findAllFiles('package.json')
    .then((paths) => isEmpty(paths) ? undefined : path.dirname(paths[0]))
}