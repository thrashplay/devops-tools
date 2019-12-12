import { Arguments, Argv, CommandBuilder, CommandModule } from 'yargs'
import yargs from 'yargs'
import { each, identity, isNil, map, merge, reduce } from 'lodash'
import { createCli } from '@thrashplay/logging'

import { ConfigurationOptions, CommandSet, Task, Result } from '.'

const log = createCli()

const getConfigurationOptions = (task: Task) => {
  return isNil(task.getConfigurationOptions) ? {} : task.getConfigurationOptions()
}

export const createBuilder = (tasks: Task[]): CommandBuilder => {
  const reducerFunction = (options: ConfigurationOptions, task: Task) => merge(options, getConfigurationOptions(task))
  return reduce(tasks, reducerFunction, {} as ConfigurationOptions)
}

export const createHandler = (tasks: Task[]) => async (args: Arguments) => {
  return reduce(tasks, (previousChain, currentTask) => {
    return previousChain
      .then((context: object) => {
        log.debug('Executing task: ', currentTask.constructor.name)
        log.debug('Context: ', JSON.stringify(context))

        return Promise.all([
          Promise.resolve(context),
          currentTask.execute(args, context) as Promise<Result<object>>,
        ])
      })
      .then(([originalContext, result]) => {
        if (result.result === 'error') {
          throw new Error('Failed executing task!')
        }
        return merge(originalContext, result.context)
      })
  }, Promise.resolve({}))
    .catch((error) => {
      if (error.message) {
        log.error('')
        log.error(error.message)
        log.error('')
      } else {
        log.error('Error executing command: ', error)
      }

      if (!isNil(error.stack)) {
        const stack = error.stack
        log.debug(stack)
      }

      process.exit(-1)
    })
}

export interface YargsOptions {
  configureCallback?: (yargs: Argv) => Argv
  scriptName?: string
  usage?: string
  wrap?: number
}

export const configure = (commands: CommandModule[], {
  configureCallback = identity,
  scriptName = process.argv[1],
  usage = '$0 <command> [options]',
  wrap = Math.min(150, yargs.terminalWidth()),
}: YargsOptions) => {
  each(commands, (command) => yargs.command(command))

  return configureCallback(
    yargs
      .scriptName(scriptName)
      .usage(usage)
      .wrap(wrap)
      .demandCommand()
      .help()
      .fail((message: string, error: Error) => {
        yargs.showHelp()

        console.log('')
        log.error(message)
        console.log('')

        if (error) {
          throw error
        }
      }),
  )
}

export const execute = (commands: CommandSet, options: YargsOptions) => {
  const commandModules = map(commands, (configuration, command) => ({
    builder: createBuilder(configuration.tasks),
    command,
    desc: configuration.description,
    handler: createHandler(configuration.tasks),
  }))

  try {
    configure(commandModules, options).parse()
  } catch (e) {
    log.error('Failed to execute command:', e)
  }
}