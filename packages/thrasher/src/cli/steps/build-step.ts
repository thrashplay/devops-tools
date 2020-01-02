import { map } from 'lodash'

import { Project } from '../../model/project'
import { PackageConfig } from '../../model'

export type BuildConfiguration = {
  /**
   * The directory being built, which should be either a monorepo root or package directory.
   */
  initialDirectory: string
}

export interface BuildStep {
  execute: (configuration: BuildConfiguration, project: Project) => Promise<Project>
}

export abstract class PackageBuildStep<TResult extends any = void> implements BuildStep {
  readonly execute = (configuration: BuildConfiguration, project: Project) => {
    return this.beforePackages(configuration, project)
      .then((shouldContinue) => {
        return shouldContinue 
          ? Promise.all(map(project.packages, (pkg) => this.executeForPackage(configuration, project, pkg)))
            .then((results) => this.afterPackages(configuration, project, results))
          : Promise.resolve(project)
      })
  }

  /**
   * Called before calling executeForPackage is called for any package, and may optionally skip executing this step.
   * If the returned promise resolves to `true`, then execution continues as normal. If the promise resolves to
   * `false`, then no packages will be processed by this step. Similarly, if the promise rejects, then the step 
   * will reject without processing any packages. In either case, if processing is skipped, 'afterExecute' will 
   * not be called either.
   * 
   * Default implementation does nothing, and returns `true` to allow package processing.
   */
  protected beforePackages = (_configuration: BuildConfiguration, _project: Project): Promise<boolean> => {
    return Promise.resolve(true)
  }

  /**
   * Called after executeForPackage has been called for every package, and returned a result.
   * 
   * In addition to the BuildConfiguration and Project being processed, this method is passed an array of all results
   * returned by the `executeForPackage` method. There will be one result for each project, and they will be in the same
   * order as the `project.packages` list. The result of this method will be returned and passed to the next step.
   * 
   * Default implementation returns the original project, without modifications.
   */
  protected afterPackages = (_configuration: BuildConfiguration, project: Project, _results: TResult[]) => project

  protected abstract executeForPackage(configuration: BuildConfiguration, project: Project, pkg: PackageConfig): Promise<TResult>
}
