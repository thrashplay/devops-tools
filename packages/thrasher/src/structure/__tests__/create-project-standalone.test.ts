import fs from 'fs'

import * as MockFsApi from '../../__mocks__/fs'
import fixtures from '../../__fixtures__'
import { createProjectStructure } from '../create-project-standalone'

jest.mock('fs')
const mockFs = fs as (typeof fs & typeof MockFsApi)

describe('standalone ProjectStructureStrategy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFs.__clear()
    mockFs.__setMockJsonFile('/app/package.json', fixtures.packageJson.default)
  })

  it('if there is no `package.json`, returns undefined', () => {
    mockFs.__removeMockFile('/app/package.json')
    const projectStructure = createProjectStructure('/app')
    return expect(projectStructure).resolves.toBeUndefined()
  })

  describe('when directory IS valid package', () => {
    it('creates project with correct rootDirectory', () => {
      const projectStructurePromise = createProjectStructure('/app')
      return expect(projectStructurePromise).resolves
        .toMatchObject({ rootDirectory: '/app' })
    })

    it('creates project with correct packageDirectories array', () => {
      const projectStructurePromise = createProjectStructure('/app')
      return expect(projectStructurePromise).resolves
        .toMatchObject({ packageDirectories: ['/app'] })
    })

    it('creates project with standalone flag', () => {
      const projectStructurePromise = createProjectStructure('/app')
      return expect(projectStructurePromise).resolves
        .toMatchObject({ 
          isMonorepo: false,
          isStandalone: true,
        })
    })
  })
})