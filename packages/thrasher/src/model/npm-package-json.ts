// modified from: https://gist.github.com/iainreid820/5c1cc527fe6b5b7dba41fec7fe54bf6e

export interface PackageJson extends Object {
  readonly author?: string | Author
  readonly bin?: string | BinMap
  readonly bugs?: string | Bugs
  readonly bundledDependencies?: string[]
  readonly config?: Config
  readonly contributors?: string[]|Author[]
  readonly cpu?: string[]
  readonly dependencies?: DependencyMap
  readonly description?: string
  readonly devDependencies?: DependencyMap
  readonly directories?: Directories
  readonly engines?: Engines
  readonly files?: string[]
  readonly homepage?: string
  readonly keywords?: string[]
  readonly license?: string
  readonly main?: string
  readonly man?: string|string[]
  readonly name: string
  readonly optionalDependencies?: DependencyMap
  readonly os?: string[]
  readonly peerDependencies?: DependencyMap
  readonly preferGlobal?: boolean
  readonly private?: boolean
  readonly publishConfig?: PublishConfig
  readonly repository?: string | Repository
  readonly scripts?: ScriptsMap
  readonly version?: string
}

/**
 * An author or contributor
 */
export interface Author {
  email?: string
  homepage?: string
  name: string
}

/**
 * A map of exposed bin commands
 */
export interface BinMap {
  [commandName: string]: string
}

/**
 * A bugs link
 */
export interface Bugs {
  email: string
  url: string
}

export interface Config {
  config?: Object
  name?: string
}

/**
 * A map of dependencies
 */
export interface DependencyMap {
  [dependencyName: string]: string
}

/**
 * CommonJS package structure
 */
export interface Directories {
  bin?: string
  doc?: string
  example?: string
  lib?: string
  man?: string
}

export interface Engines {
  node?: string
  npm?: string
}

export interface PublishConfig {
  registry?: string
}

/**
 * A project repository
 */
export interface Repository {
  type: string
  url: string
}

export interface ScriptsMap {
  [scriptName: string]: string
}

export const validatePackageJson = (packageJsonToValidate: any): PackageJson => {
  // TODO: implement validation
  return packageJsonToValidate as PackageJson
}