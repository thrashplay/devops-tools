import { Options } from 'yargs'

export type ConfigurationOptions<T extends object = {}> = { [key in keyof T]: Options }

export type ResultCode = 'success' | 'error'

export interface Result<TContext extends object = any> {
  result: ResultCode
  context?: TContext
}

export interface Task<
  TConfig extends object = any,
  TInputContext extends object = any,
  TOutputContext extends TInputContext = TInputContext
> {
  getConfigurationOptions?: () => ConfigurationOptions<TConfig>
  execute: (configuration: TConfig, context?: TInputContext) => Promise<Result<TOutputContext>>
}

export const error = <TErrorContext extends object = any>(outputContext?: TErrorContext): Result<TErrorContext> => 
  ({ result: 'error' as ResultCode, context: outputContext })
export const success = <TOutputContext extends object = any>(outputContext?: TOutputContext): Result<TOutputContext> => 
  ({ result: 'success' as ResultCode, context: outputContext })

export abstract class AbstractTask<
  TConfig extends object = any,
  TInputContext extends object = any,
  TOutputContext extends TInputContext = any,
  TErrorContext extends object = any
> implements Task<TConfig, TInputContext, TOutputContext> {
  abstract getConfigurationOptions(): ConfigurationOptions<TConfig>
  abstract execute(configuration: TConfig, context?: TInputContext): Promise<Result<TOutputContext>>

  protected error = (outputContext?: TErrorContext): Result<TErrorContext> => ({ result: 'error' as ResultCode, context: outputContext })
  protected success = (outputContext?: TOutputContext): Result<TOutputContext> => ({ result: 'success' as ResultCode, context: outputContext })
}

export interface CommandError {
  message: string
  stack?: string
}

export interface CommandSet {
  [key: string]: {
    description: string,
    tasks: Task[]
  }
}
