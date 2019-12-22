import path from 'path'

import { 
  defaultTo,
  get,
  has,
  isFunction,
  isNil,
  isPlainObject,
  isString,
  isUndefined,
  merge,
  noop,
  replace,
  set,
} from 'lodash'

const fs = jest.genMockFromModule('fs')

let mockFiles: { [path: string]: string } = {}

/**
 * Replaces '/' and '\' characters in the path with the path separator for the current system.
 */
const normalizePath = (pathString: string) => replace(pathString, /[/\\]/g, path.sep)

/**
 * Removes the contents of a mocked with the given path, to the given string. Any attempts
 * to access this file will behave as the file doesn't exist. This affects the same fs 
 * functions as specified in the documentation for the __setMockFile function.
 * 
 * All path values are normalized, so that '/' and '\' characters are replaced with
 * the appropriate system-specific path separator.
 */
export const __removeMockFile = (path: string) => {
  delete mockFiles[normalizePath(path)]
}

/**
 * Sets the contents of a mocked with the given path, to the given string. This
 * affects the following fs functions:
 * 
 *   - existsSync
 *   - readFile
 *   - readFileSync
 * 
 * All path values are normalized, so that '/' and '\' characters are replaced with
 * the appropriate system-specific path separator.
 */
export const __setMockFile = (path: string, contents: string) => {
  mockFiles[normalizePath(path)] = contents
}

/**
 * Sets the contents of a mocked with the given path, to the JSON string form of
 * the given value. This affects the same fs functions as specified in the documentation
 * for the __setMockFile function.
 * 
 * All path values are normalized, so that '/' and '\' characters are replaced with
 * the appropriate system-specific path separator.
 */
export const __setMockJsonFile = (path: string, contents: any) => {
  __setMockFile(path, JSON.stringify(contents))
}

export const __clear = () => {
  mockFiles = {}
}

const createMissingFileError = (path: string): NodeJS.ErrnoException => {
  const error = new Error(`ENOENT: no such file or directory, open '${path}'`)
  set(error, 'errno', -4058)
  set(error, 'code', 'ENOENT')
  set(error, 'syscall', 'open')
  set(error, 'path', path)
  return error
}

const existsSyncMock = (path: string) => has(mockFiles, path)

const getFileContents = (path: string, encoding?: string) => {
  const fileContents = get(mockFiles, path)
  return isUndefined(encoding) ? Buffer.from(fileContents, 'utf8') : fileContents
}

type ReadFileOptions = string | { encoding?: string | null, flag?: string }
type ReadFileCallback = (err: NodeJS.ErrnoException, data?: string | Buffer) => void
const readFileMock = (path: string, optionsOrCallback: ReadFileOptions | ReadFileCallback, callback?: ReadFileCallback ) => {
  if (isFunction(optionsOrCallback) && !isNil(callback)) {
    throw new Error('Cannot specify a callback option for both the second and third argument to "readFile".')
  }

  let encoding
  let resolvedCallback

  if (isString(optionsOrCallback)) {
    encoding = optionsOrCallback
    resolvedCallback = defaultTo(callback, noop)
  } else if (isPlainObject(optionsOrCallback)) {
    encoding = get(optionsOrCallback, 'encoding')
    resolvedCallback = defaultTo(callback, noop)
  } else if (isFunction(optionsOrCallback)) {
    encoding = undefined
    resolvedCallback = defaultTo(optionsOrCallback, noop)
  }

  if (has(mockFiles, path)) {
    resolvedCallback(undefined, getFileContents(path, encoding))
  } else {
    resolvedCallback(createMissingFileError(path))
  }
}

const readFileSyncMock = (path: string, options?: ReadFileOptions) => {
  let encoding

  if (isString(options)) {
    encoding = options
  } else if (isPlainObject(options)) {
    encoding = get(options, 'encoding')
  } else {
    encoding = undefined
  }

  if (has(mockFiles, path)) {
    return getFileContents(path, encoding)
  } else {
    throw createMissingFileError(path)
  }
}

module.exports = merge(fs, {
  __clear,
  __removeMockFile,
  __setMockFile,
  __setMockJsonFile,
  existsSync: existsSyncMock,
  readFile: readFileMock,
  readFileSync: readFileSyncMock,
})