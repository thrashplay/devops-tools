export class ProjectStructure {
  public constructor(
    public readonly rootDirectory: string,
    public readonly packageDirectories: string[],
  
    /**
    * Determines if this project is using a monorepo structure.
    */
    public readonly isMonorepo = false,
  ) { }

  /**
   * Determines if this project is using a standaplone package structure.
   */
  public get isStandalone() {
    return !this.isMonorepo
  }
}