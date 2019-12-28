import { isNil } from 'lodash'

import { ProjectStructure } from '../model/project-structure'

import { createProjectStructure as createLernaProjectStructure } from './create-project-lerna'
import { createProjectStructure as createStandaloneProjectStructure } from './create-project-standalone'

/**
 * Strategy for determining the structure of a project, given a directory (root or subdirectory)
 * from inside that project.
 *
 * If this strategy is able to determine the project structure for the directory, returns a
 * Promise that resolves to the project's structure. If this strategy is unable to do so,
 * the promise will resolve to `undefined`.
 */
export type ProjectStructureStrategy = (initialDirectory: string) => Promise<ProjectStructure | undefined>

export interface ProjectStructureFactoryOptions {
  createProjectStructureStrategies: ProjectStructureStrategy[]
}
export const createProjectStructureFactory = ({
  createProjectStructureStrategies,
}: ProjectStructureFactoryOptions) => {  
  return {
    createProjectStructure: async (initialDirectory: string): Promise<ProjectStructure> => {
      for (let strategy of createProjectStructureStrategies) {
        const project = await strategy(initialDirectory)
        if (!isNil(project)) {
          return project
        }
      }

      throw new Error(`Cannot determine project structure for directory: ${initialDirectory}`)
    },
  }
}

export const defaultProjectStructureFactory = createProjectStructureFactory({
  createProjectStructureStrategies: [createLernaProjectStructure, createStandaloneProjectStructure],
})