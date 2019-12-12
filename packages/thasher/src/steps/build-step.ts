
import { Project } from '../model/project'

export type BuildConfiguration = {
  /**
   * The directory being built, which should be either a monorepo root or package directory.
   */
  initialDirectory: string
}

export interface BuildStep {
  execute: (configuration: BuildConfiguration, project: Project) => Promise<Project>
}


