import path from 'path'

import fs from 'fs-extra'
import Project from '@lerna/project'
import { map } from 'lodash'

import { ProjectStructure } from '../model/project-structure'

import { ProjectStructureStrategy } from '.'

const isLernaProjectValid = (project: Project) => {
  const lernaJsonPath = path.join(project.rootPath, 'lerna.json')
  return fs.pathExists(lernaJsonPath)
}

const mapAllUsing = <TResult>(mapper: (pathString: string) => TResult) => {
  return (paths: string[]) => map(paths, mapper)
}
const mapPackageJsonToDirectory = (packageJsonPath: string) => {
  const after = path.dirname(packageJsonPath)
  return after
}

const doCreateProjectStructure = (project: Project) => {
  return project.fileFinder('package.json', mapAllUsing(mapPackageJsonToDirectory))
    .then((packageDirectories) => new ProjectStructure(project.rootPath, packageDirectories, true))
}

/**
 * Project Structure creation strategy that is able to derive the project structure
 * for a Lerna monorepo project. The `initialDirectory` must be in the monorepo root, or
 * one its sub-folders. The project root must contain a valid 'lerna.json' file.
 */
export const createProjectStructure: ProjectStructureStrategy = (initialDirectory: string) => {
  return Promise.resolve()
    .then(() => new Project(initialDirectory))
    .then((project) => {
      return isLernaProjectValid(project)
        .then((isValid) => isValid ? doCreateProjectStructure(project) : undefined)
    })
}