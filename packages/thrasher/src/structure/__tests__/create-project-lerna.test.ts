import path from 'path'
import fs from 'fs'

import Project, { FileMapper } from '@lerna/project'
import { map, omit } from 'lodash'

import * as MockFsApi from '../../__mocks__/fs'
import { createProjectStructure } from '../create-project-lerna'
import { normalizePath } from '../../test-utils'

jest.mock('@lerna/project')
jest.mock('fs')
const mockFs = fs as (typeof fs & typeof MockFsApi)

interface LernaProject {
  packageRoots?: string[]
  rootPath?: string
}

const defaultLernaProject = {
  packageRoots: [
    '/app/packages/my-package-1',
    '/app/other-dir/my-package-2',
  ],
  rootPath: normalizePath('/app'),
} as LernaProject

const initializeMockProject = (project: LernaProject) => {
  return Project.mockImplementation(() => ({ 
    ...omit(project, 'packageRoots'),
    fileFinder: jest.fn((fileName, mapper: FileMapper) => {
      return Promise.resolve(mapper(map(project.packageRoots, (root) => normalizePath(path.join(root, fileName)))))
    }),
  }))
}

describe('lerna ProjectStructureStrategy', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    mockFs.__clear()
    
    initializeMockProject(defaultLernaProject)
    mockFs.__setMockJsonFile('/app/lerna.json', {
      version: '1.1.3',
    })
  })

  it('creates Lerna project with correct cwd', async () => {
    await createProjectStructure('/app/packages/my-package')
    expect(Project).toHaveBeenCalledTimes(1)
    expect(Project).toHaveBeenLastCalledWith('/app/packages/my-package')
  })

  describe('when Lerna project is NOT valid', () => {
    it('if no lerna.json exists, returns undefined', () => {
      mockFs.__removeMockFile('/app/lerna.json')
      const projectStructurePromise = createProjectStructure('/app/packages/my-package-1')
      return expect(projectStructurePromise).resolves
        .toBeUndefined()
    })
  })

  describe('when Lerna project IS valid', () => {
    it('creates project with correct rootDirectory', () => {
      const projectStructurePromise = createProjectStructure('/app/packages/my-package-1')
      return expect(projectStructurePromise).resolves
        .toMatchObject({ rootDirectory: normalizePath('/app') })
    })

    it('creates project with correct packageDirectories array', () => {
      const projectStructurePromise = createProjectStructure('/app/packages/my-package-1')
      return expect(projectStructurePromise).resolves
        .toMatchObject({ 
          packageDirectories: [
            normalizePath('/app/packages/my-package-1'),
            normalizePath('/app/other-dir/my-package-2'),
          ],
        })
    })

    it('creates project with monorepo flag', () => {
      const projectStructurePromise = createProjectStructure('/app/packages/my-package')
      return expect(projectStructurePromise).resolves
        .toMatchObject({ 
          isMonorepo: true,
          isStandalone: false,
        })
    })
  })
})