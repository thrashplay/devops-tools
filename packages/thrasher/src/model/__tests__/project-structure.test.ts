import { ProjectStructure, createProjectStructureFactory } from '../project-structure'

const matchingRootDirectoryLocator = jest.fn((directory) => Promise.resolve(`/root${directory}`))
const matchingProjectStructureInitializer = jest.fn((directory) => Promise.resolve(new ProjectStructure(directory, [directory], false)))
const nonMatchingRootDirectoryLocator = jest.fn(() => Promise.resolve(undefined))
const nonMatchingProjectStructureInitializer = jest.fn(() => Promise.resolve(undefined))
const unusedMatchingRootDirectoryLocator = jest.fn(() => Promise.resolve('/wrong-dir'))
const unusedMatchingProjectStructureInitializer = jest.fn(() => Promise.resolve(new ProjectStructure('/wrong-dir', [], true)))

describe('createProjectStructure', () => {
  const createSuccessfulFactory = () => createProjectStructureFactory({
    rootDirectoryLocators: [nonMatchingRootDirectoryLocator, matchingRootDirectoryLocator, unusedMatchingRootDirectoryLocator],
    projectStructureInitializers: [nonMatchingProjectStructureInitializer, matchingProjectStructureInitializer, unusedMatchingProjectStructureInitializer],
  })

  const createFactoryThatCannotLocateRootDirectory = () => createProjectStructureFactory({
    rootDirectoryLocators: [nonMatchingRootDirectoryLocator],
    projectStructureInitializers: [nonMatchingProjectStructureInitializer, matchingProjectStructureInitializer, unusedMatchingProjectStructureInitializer],
  })

  const createFactoryThatCannotInitializeStructure = () => createProjectStructureFactory({
    rootDirectoryLocators: [nonMatchingRootDirectoryLocator, matchingRootDirectoryLocator, unusedMatchingRootDirectoryLocator],
    projectStructureInitializers: [nonMatchingProjectStructureInitializer],
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('only calls rootDirectoryLocators a single time', () => {
    const projectStructureFactory = createSuccessfulFactory()

    return projectStructureFactory.createProjectStructure('/app')
      .then(() => {
        expect(nonMatchingRootDirectoryLocator).toHaveBeenCalledTimes(1)
        expect(matchingRootDirectoryLocator).toHaveBeenCalledTimes(1)
      })
  })

  it('only calls projectStructureInitializers a single time', () => {
    const projectStructureFactory = createSuccessfulFactory()

    return projectStructureFactory.createProjectStructure('/app')
      .then(() => {
        expect(nonMatchingProjectStructureInitializer).toHaveBeenCalledTimes(1)
        expect(matchingProjectStructureInitializer).toHaveBeenCalledTimes(1)
      })
  })

  it('rejects when root directory cannot be located', () => {
    const projectStructureFactory = createFactoryThatCannotLocateRootDirectory()
    return expect(projectStructureFactory.createProjectStructure('/app'))
      .rejects.toThrowError('Cannot find project root for directory: /app')
  })

  it('rejects when project structure cannot be initialized for root directory', () => {
    const projectStructureFactory = createFactoryThatCannotInitializeStructure()
    return expect(projectStructureFactory.createProjectStructure('/app'))
      .rejects.toThrowError('Project root does not match any known project structure: /app')
  })

  it('resolves when project structure can be determined', () => {
    const projectStructureFactory = createSuccessfulFactory()
    return projectStructureFactory.createProjectStructure('/app')
      .then((projectStructure) => {
        expect(projectStructure).toBeDefined()
        expect(projectStructure.rootDirectory).toEqual('/root/app')
        expect(projectStructure.packageDirectories).toEqual(['/root/app'])
        expect(projectStructure.isMonorepo).toEqual(false)
        expect(unusedMatchingRootDirectoryLocator).not.toHaveBeenCalled()
        expect(unusedMatchingProjectStructureInitializer).not.toHaveBeenCalled()
      })
  })
})