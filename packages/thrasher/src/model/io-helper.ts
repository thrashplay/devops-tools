import path from 'path'
import fs, { promises as fsp } from 'fs'

export class IoHelper {
  constructor(public readonly rootPath: string) { }

  public pathExists = (relativePath: string) => {
    const filePath = path.resolve(this.rootPath, relativePath)
    try {
      fs.statSync(filePath)
      return true
    } catch (err) {
      // assume path doesn't exist
      return false
    }
  }

  /**
   * Reads a file, relative to the root directory.
   */
  public readFile = (relativePath: string) => {
    return fsp.readFile(path.resolve(this.rootPath, relativePath), 'utf8')
  }

  /**
   * Reads a file, relative to the root directory, and attempts to parse it as JSON.
   * Will reject the promise if the specified path is not a valid JSON file.
   */
  public readJsonFile = (relativePath: string) => {
    return this.readFile(relativePath)
      .then((fileContents) => JSON.parse(fileContents))
      .catch((err) => {
        if (err instanceof SyntaxError) {
          err.message = `File '${relativePath}' does not contain valid JSON: ${err.message}`
        }
        throw err
      })
  }

  /**
   * Writes a file, relative to the root directory.
   */
  public writeFile = (relativePath: string, contents: string) => {
    const filePath = path.resolve(this.rootPath, relativePath)
    return fsp.mkdir(path.dirname(filePath), { recursive: true })
      .then(() => fsp.writeFile(filePath, contents))
  }

  /**
   * Writes a value as JSON into a file, relative to the root directory.
   */
  public writeJsonFile = (relativePath: string, contents: any) => {
    return this.writeFile(relativePath, JSON.stringify(contents, null, 2))
  }
}