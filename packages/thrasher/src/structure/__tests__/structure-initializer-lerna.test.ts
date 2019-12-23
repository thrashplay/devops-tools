import path from 'path'

import { intersection, last, map } from 'lodash'

import { ProjectStructureInitializer } from '.'

const convertToDirectories = (paths: string[]) => map(paths, (pathString) => path.dirname(pathString))

export const execute: ProjectStructureInitializer = (root: string) => {
  return Promise.resolve(undefined)
}