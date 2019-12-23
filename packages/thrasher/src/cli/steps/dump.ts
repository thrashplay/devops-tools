import { Project } from '../../model'

import { BuildStep, BuildConfiguration } from './build-step'

export const create = (): BuildStep => {
  return {
    execute: (_configuration: BuildConfiguration, project: Project) => {
      console.log('proj:', project)
      return Promise.resolve(project)
    },
  }
}