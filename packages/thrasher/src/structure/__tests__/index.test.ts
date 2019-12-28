import { ProjectStructure } from '../../model'

import { createProjectStructureFactory } from '..'

const failingStrategy = jest.fn(() => Promise.resolve(undefined))
const successfulStrategy = jest.fn((directory) => Promise.resolve(new ProjectStructure(`/root${directory}`, [`/root${directory}`], false)))

describe('createProjectStructure', () => {
  const createSuccessfulFactory = () => createProjectStructureFactory({
    createProjectStructureStrategies: [failingStrategy, successfulStrategy],
  })

  const createSuccessBeforeFailureFactory = () => createProjectStructureFactory({
    createProjectStructureStrategies: [successfulStrategy, failingStrategy],
  })


  const createFailingFactory = () => createProjectStructureFactory({
    createProjectStructureStrategies: [failingStrategy],
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('only calls strategies a single time', () => {
    const projectStructureFactory = createSuccessfulFactory()

    return projectStructureFactory.createProjectStructure('/app')
      .then(() => {
        expect(failingStrategy).toHaveBeenCalledTimes(1)
        expect(successfulStrategy).toHaveBeenCalledTimes(1)
      })
  })

  it('rejects when project structure cannot be determined', () => {
    const projectStructureFactory = createFailingFactory()
    return expect(projectStructureFactory.createProjectStructure('/app'))
      .rejects.toThrowError('Cannot determine project structure for directory: /app')
  })

  it('resolves when project structure can be determined', () => {
    const projectStructureFactory = createSuccessfulFactory()
    return projectStructureFactory.createProjectStructure('/app')
      .then((projectStructure) => {
        expect(projectStructure).toBeDefined()
        expect(projectStructure.rootDirectory).toEqual('/root/app')
        expect(projectStructure.packageDirectories).toEqual(['/root/app'])
        expect(projectStructure.isMonorepo).toEqual(false)
      })
  })

  it('does not call additional strategies once project structure can be determined', () => {
    const projectStructureFactory = createSuccessBeforeFailureFactory()
    return projectStructureFactory.createProjectStructure('/app')
      .then(() => {
        expect(failingStrategy).not.toHaveBeenCalled()
      })
  })
})