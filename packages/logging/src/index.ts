import chalk, { Chalk } from 'chalk'
import { isNil, join } from 'lodash'

export type LogLevel = 'error' | 'info' | 'debug'

export type Styles = {
  [key in LogLevel]: Chalk
}

export interface Logger {
  debug: (message?: any, ...placeholders: any[]) => void
  error: (message?: any, ...placeholders: any[]) => void
  info: (message?: any, ...placeholders: any[]) => void
}

export interface LoggerColors {
  debugChalk?: Chalk
  infoChalk?: Chalk
  errorChalk?: Chalk
}

export const createCli = (level: LogLevel = 'info', { debugChalk, errorChalk, infoChalk }: LoggerColors = {}) => {
  const calculatedDebugChalk = isNil(debugChalk) ? chalk.gray : debugChalk!
  const calculatedErrorChalk = isNil(errorChalk) ? chalk.yellow : errorChalk!
  const calculatedInfoChalk = isNil(infoChalk) ? chalk.white : infoChalk!

  const isEnabled = {
    debug: level === 'debug',
    error: true,
    info: level === 'debug' || level === 'info',
  }

  const logIfEnabled = (level: LogLevel, color: Chalk, message?: any, ...placeholders: any[]) => {
    if (!isEnabled[level]) {
      return
    }

    switch (level) {
      case 'error': 
        console.error(color(message, join(placeholders, ' ')))
        break

      default: 
        console.log(color(message, join(placeholders, ' ')))        
        break
    }
  }

  return {
    debug: (message?: any, ...placeholders: any[]) => { logIfEnabled('debug', calculatedDebugChalk, message, placeholders) },
    error: (message?: any, ...placeholders: any[]) => { logIfEnabled('error', calculatedErrorChalk, message, placeholders) },
    info: (message?: any, ...placeholders: any[]) => { logIfEnabled('info', calculatedInfoChalk, message, placeholders) },
  }
}
