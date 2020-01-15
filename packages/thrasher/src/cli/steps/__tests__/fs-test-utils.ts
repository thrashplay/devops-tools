import fs from 'fs'

import { isFunction } from 'lodash'

export type JsonType = string | number | object | boolean | null
export type JsonArray = JsonType[]
export type JsonValue = JsonType | JsonArray

export function assertJsonFile<T extends any = any>(path: string, verifierFunction: (contents: T) => void): void
export function assertJsonFile(path: string, expectedContents: JsonValue): void
export function assertJsonFile(path: string, expectedContentsOrVerifier: any) {
  const contents = JSON.parse(fs.readFileSync(path, 'utf8'))
  if (isFunction(expectedContentsOrVerifier)) {
    expectedContentsOrVerifier(contents)
  } else {
    expect(contents).toBe(expectedContentsOrVerifier)
  }
}