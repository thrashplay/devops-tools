import { isEqual, isUndefined } from 'lodash'
import { error, execute, success, Task } from '@thrashplay/modular-cli'

import { createProjectFactory, Project } from '../model'

import { BuildConfiguration, BuildStep } from './steps'
import { Steps } from './steps'

const projectFactory = createProjectFactory()

const initializeProject = (configuration: BuildConfiguration) => {
  return projectFactory.createProject(configuration.initialDirectory)
}

type BuildTask = Task<BuildConfiguration, Project>
const createBuildTask = (buildStep: BuildStep): BuildTask => {
  return {
    getConfigurationOptions: () => {
      return {
        initialDirectory: {
          description: 'the directory to start the build in',
          type: 'string',
          default: process.cwd(),
          defaultDescription: 'the current working directory of the build process',
        },
      }
    },
    execute: (configuration: BuildConfiguration, context?: Project) => {
      return Promise.resolve(isEqual({}, context) || isUndefined(context) ? initializeProject(configuration) : context)
        .then((project) => buildStep.execute(configuration, project))
        .then((result) => success(result))
        .catch((result) => error(result))
    },
  }
}

const commands = {
  'create-tsconfigs': {
    description: 'Creates project TSConfig JSON files.',
    tasks: [
      createBuildTask(Steps.createCreateTsConfigs()),
    ],
  },
  'dump': {
    description: 'Dumps project info.',
    tasks: [
      createBuildTask(Steps.createDump()),
    ],
  },
}

export const run = async () => {
  const { createProjectStructure } = require('../structure/create-project-lerna')
  console.log(await createProjectStructure(process.cwd()))

  try {
    execute(commands, { scriptName: 'thrasher' })
  } catch (e) {
    console.error('Failed to execute command:', e)
  }
}