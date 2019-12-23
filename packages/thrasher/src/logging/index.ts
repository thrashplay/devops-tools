export interface Logger {
  /**
   * Prints to `stdout` with newLine.
   */
  debug(message?: any, ...optionalParams: any[]): void

  /**
   * Prints to `stderr` with newline.
   */
  error(message?: any, ...optionalParams: any[]): void

  info(message?: any, ...optionalParams: any[]): void

  /**
   * The {@link Logger.warn()} function is an alias for {@link Logger.error()}.
   */
  warn(message?: any, ...optionalParams: any[]): void
}

export const createLogger = (): Logger => {
  return {
    debug: console.log,
    error: console.error,
    info: console.log,
    warn: console.error,
  }
}