import {
  isNil,
  isUndefined,
  merge,
} from 'lodash'
import MemoryFs from 'metro-memory-fs'
import { getSupportedCodeFixes } from 'typescript'

let cwd: string | undefined = undefined

const fs = new MemoryFs({
  cwd: () => isUndefined(cwd) ? process.cwd() : cwd,
  platform: process.platform as 'posix' | 'win32',
})

need to add platform-specific getSupportedCodeFixes, and ability to require different configurations
see: https://github.com/facebook/metro/blob/7b4615080947c81ca9c7b73e1a7e5c5995e540e6/packages/metro/src/DeltaBundler/__tests__/resolver-test.js

export const __assertFileWasWritten = (filePath: string, fileContents: string) => {
  expect(fs.existsSync(filePath)).toBe(true)
  expect(fs.readFileSync(filePath, 'utf8')).toEqual(fileContents)
}

export const __assertJsonFileWasWritten = (filePath: string, fileContents: any) => {
  expect(fs.existsSync(filePath)).toBe(true)

  const jsonFileContent = fs.readFileSync(filePath, 'utf8')
  expect(JSON.parse(jsonFileContent)).toEqual(fileContents)
}

export const __getWrittenFileContents = (filePath: string) => {
  return fs.readFileSync(filePath, 'utf8')
}

export const __getWrittenJsonFileContents = (filePath: string) => {
  const contents = __getWrittenFileContents(filePath)
  return isNil(contents) ? undefined : JSON.parse(contents)
}

export const __removeMockFile = (path: string) => {
  fs.unlinkSync(path)
}

export const __setCwd = (path: string | undefined) => {
  cwd = path
  
  if (!isUndefined(path)) {
    // metro-memory-fs requires creating whatever directory you use as the `cwd`
    fs.mkdirSync(path, { recursive: true })
  }
}

export const __setMockFile = (path: string, contents: string) => {
  fs.writeFileSync(path, contents)
}

export const __setMockJsonFile = (path: string, contents: any) => {
  __setMockFile(path, JSON.stringify(contents))
}

export const __clear = () => {
  fs.reset()
  cwd = undefined
}

module.exports = merge({},
  module.exports,
  fs,
)
