import path from 'path'

import { get, head, isUndefined, mapKeys, merge, replace } from 'lodash'

export const INVALID_JSON = 'invalid json'

export interface MockDirectoryWalkerResults { 
  initialDirectory?: {
    [key: string]: string[]
  }
}

export const __clear = () => {
  __setMockDirectoryWalkerResults({})
  __setMockLoadJsonResults({})
}

let mockDirectoryWalkerResults: MockDirectoryWalkerResults
export function __setMockDirectoryWalkerResults(newMockDirectoryWalkerResults: MockDirectoryWalkerResults) {
  mockDirectoryWalkerResults = merge({}, newMockDirectoryWalkerResults)
}

let mockLoadJsonResults: { [key: string]: object | typeof INVALID_JSON}
export function __setMockLoadJsonResults(newMockLoadJsonResults: { [key: string]: object }) {
  mockLoadJsonResults = merge({}, normalizePathKeys(newMockLoadJsonResults))
}

export const createDirectoryWalker = (initialDirectory: string, _rootDirectory?: string) => ({
  findAllFiles: (fileToFind: string) => {
    const resultsForRoot = get(mockDirectoryWalkerResults, initialDirectory)
    const results = isUndefined(resultsForRoot) ? undefined : resultsForRoot[fileToFind]
    return isUndefined(results) ? Promise.resolve([] as string[]) : Promise.resolve(results)
  },
  findFirstFile: (fileToFind: string) => {
    const resultsForRoot = get(mockDirectoryWalkerResults, initialDirectory)
    const results = isUndefined(resultsForRoot) ? undefined : resultsForRoot[fileToFind]
    return isUndefined(results) ? Promise.resolve(undefined) : Promise.resolve(head(results))
  },
})

export function loadJson(fileToLoad: string): Promise<object> {
  const contents = mockLoadJsonResults[fileToLoad]
  if (isUndefined(contents)) {
    return Promise.reject(new Error(`no mock contents set for file: ${fileToLoad}`))
  } else if (contents == INVALID_JSON) {
    return Promise.reject(`File '${fileToLoad} could not be parsed as valid JSON.`)
  } else {
    return Promise.resolve(contents)
  }
}

/**
 * Takes a mock file contents structure like the following:
 * 
 * {
 *   '/path/to/file': <FILE_CONTENTS_OBJECT>,
 *   '\\path\\to\\other\\file': <FILE_CONTENTS_OBJECT>,
 *   ...
 * }
 * 
 * and normalizes the paths, replacing '/' and '\' characters with the path separator
 * for the current system.
 */
const normalizePathKeys = (mockFileContents: { [path in string]: object }) => {
  return mapKeys(mockFileContents, (_fileContents, filePath) => replace(filePath, /[/\\]/g, path.sep))
}
