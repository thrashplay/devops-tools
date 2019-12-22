/**
 * Detected structure of a project's code repository. Contains values indicating if the
 * code is a monorepo or standalone package, as well as a list of all detected package 
 * roots within the repository.
 */
export class RepoStructure {
  constructor(
    readonly rootDirectory: string,
    readonly packageDirectories: string[],
  ) { }

  get isMonorepo() {
    return this.packageDirectories.length !== 1 || this.packageDirectories[0] !== this.rootDirectory
  }

  get isStandalone() {
    return !this.isMonorepo
  }
}