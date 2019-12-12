import { get, head, isUndefined, merge } from 'lodash'

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

let mockLoadJsonResults: { [key: string]: object }
export function __setMockLoadJsonResults(newMockLoadJsonResults: { [key: string]: object }) {
  mockLoadJsonResults = merge({}, newMockLoadJsonResults)
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
  } else {
    return Promise.resolve(contents)
  }
}
