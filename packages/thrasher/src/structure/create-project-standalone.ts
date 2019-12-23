import path from 'path'

import fs from 'fs-extra'

import { ProjectStructure } from '../model/project-structure'

import { ProjectStructureStrategy } from '.'

const doCreateProjectStructure = (initialDirectory: string) => new ProjectStructure(
  initialDirectory,
  [initialDirectory],
  false,
)

/**
 * Project Structure creation strategy that is able to derive the project structure
 * for a standalone package. The `initialDirectory` must be in the package root, and
 * the package root must contain a valid `package.json` file.
 */
export const createProjectStructure: ProjectStructureStrategy = (initialDirectory: string) => {
  return fs.pathExists(path.resolve(initialDirectory, 'package.json'))
    .then((exists) => exists ? doCreateProjectStructure(initialDirectory) : undefined)
}