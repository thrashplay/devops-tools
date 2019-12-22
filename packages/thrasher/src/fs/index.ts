import path from 'path'
import fs from 'fs'

import { concat, head, isUndefined } from 'lodash'
import findUp from 'find-up'

export type FileType = 'file' | 'directory'
export type FindMode = 'first' | 'all'

export type DirectoryWalkerFactory = (initialDirectory: string, rootDirectory?: string) => DirectoryWalker
export type JsonFileLoader = (fileToLoad: string) => Promise<object>

export interface DirectoryWalker {
  /**
  * Finds the path to all files with a given name in a directory tree. In descending order from the configured initial
  * directory to the configured rootDirectory all paths to matching files will be returned. If no matching
  * files are found, an empty array will be returned.
  * 
  * An exception is thrown if `initialDirectory` is not a descendant of `rootDirectory`.
  */
  findAllFiles: (fileToFind: string) => Promise<string[]>

  /**
   * Starting in `initialDirectory`, searches for a file with the specified name. If the initial directory
   * contains such a file, then it is returned. Otherwise, each parent directory is searched successively
   * until one of the following conditions is true:
   * 
   *   - a matching file is found, in which case it's path is returned
   *   - the specified root directory is reached without finding a matching file, in which case `undefined` is returned
   *   - the filesystem root is reached without finding a matching file, in which case `undefined` is returned
   * 
   * An exception is thrown if `initialDirectory` is not a descendant of `rootDirectory`.
   */
  findFirstFile: (fileToFind: string) => Promise<string | undefined>
}

interface FindOptions {
  initialDirectory?: string
  rootDirectory?: string
  mode?: FindMode
}

const findFilesInParents = (fileToFind: string, { initialDirectory, rootDirectory, mode }: FindOptions) => {
  const findFirst = mode === 'first'

  const isAtRoot = (currentDirectory: string) => {
    return !isUndefined(rootDirectory) && currentDirectory === rootDirectory
  }

  const matcher = (currentDirectory: string) => {
    const filePath = path.join(currentDirectory, fileToFind)
    return findUp.exists(filePath)
      .then((exists) => {
        return exists
          ? filePath
          : isAtRoot(currentDirectory) ? findUp.stop : undefined
      })
  }

  const findUpAll = (results: string[], fileToFind: string, initialDirectory: string, rootDirectory?: string): Promise<string[]> => {
    return findUp(matcher, isUndefined(initialDirectory) ? {} : { cwd: initialDirectory })
      .then((foundFile) => {
        if (isUndefined(foundFile)) {
          return results
        } else {
          const newResults = concat([foundFile], results)
          const matchingPath = path.dirname(foundFile)
          const parentOfFoundFile = path.resolve(matchingPath, '..')
          return findFirst || isAtRoot(matchingPath) ? newResults : findUpAll(newResults, fileToFind, parentOfFoundFile, rootDirectory)
        }
      })
  }

  return findUpAll([], fileToFind, isUndefined(initialDirectory) ? process.cwd() : initialDirectory, rootDirectory)
}

// const findParentDirectoriesWithFile = (fileToFind: string, options: FindOptions) => {
//   return findFilesInParents(fileToFind, options)
//     .then((files) => map(files, (file) => path.dirname(file)))
// }

/**
 * Creates a directory walker used to locate files and directories in a subtree of the file system.
 * All directory walk operations will start in the `initialDirectory`, and navigate up the directory hierarchy
 * until `rootDirectory` is reached (inclusive). If no `rootDirectory` is specified, the filesystem root will
 * be used instead.
 * 
 * An exception is thrown if `initialDirectory` is not a descendant of `rootDirectory`.
 */
export const createDirectoryWalker: DirectoryWalkerFactory = (initialDirectory: string, rootDirectory?: string) => {
  const options = {
    initialDirectory: initialDirectory,
    rootDirectory: rootDirectory,
  }

  return {
    findAllFiles: (fileToFind: string) => findFilesInParents(fileToFind, options),
    findFirstFile: (fileToFind: string) => findFilesInParents(fileToFind, options).then((matchingFiles) => head(matchingFiles)),
  }
}

/**
 * Loads the specified file into a JSON object. If the file doesn't exist or can't be loaded, the Promise will be
 * rejected.
 * 
 * Throws a NodeJS.ErrnoException if the file does not exist.
 * Throws a SyntaxError if the file exists, but does not contain valid JSON.
 */
export const loadJson: JsonFileLoader = (fileToLoad: string) => {
  return new Promise((resolve, reject) => {
    fs.readFile(fileToLoad, 'utf8', (error, data) => {
      if (!isUndefined(error)) {
        reject(error)
      } else {
        resolve(JSON.parse(data))
      }
    })
  })
}