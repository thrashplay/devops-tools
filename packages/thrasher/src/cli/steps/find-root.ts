import { Project } from '../../model'
import { createLogger } from '../../logging'

import { BuildStep, BuildConfiguration } from './build-step'

const log = createLogger()

export const create = (): BuildStep => {
  return {
    execute: (_configuration: BuildConfiguration, project: Project) => {
      console.log('proj:', project)
      return Promise.resolve(project)
    },
  }
}