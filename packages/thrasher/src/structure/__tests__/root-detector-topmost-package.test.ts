import Project from '@lerna/project'

import * as MockDirectoryWalkerApi from '../__mocks__/directory-walker'
import * as directoryWalker from '../directory-walker'
import { execute } from '../root-detector-topmost-package'

jest.mock('../directory-walker')
const mockDirectoryWalker = directoryWalker as (typeof directoryWalker & typeof MockDirectoryWalkerApi)

describe('topmost-package-root-detector', () => {
  beforeEach(async () => {
    mockDirectoryWalker.__clear()

    const project = new Project('d:\\sandbox\\thrashplay\\devops-tools\\packages\\thrasher')
    console.log('it:', JSON.stringify((await project.getPackages())[0].location))
  })

  it('when initial directory (and no ancestors) have package.json, return initial directory', () => {
    mockDirectoryWalker.__setMockDirectoryWalkerResults(
      '/base/parent/app',
      'package.json',
      '/base/parent/app/package.json')

    return expect(execute('/base/parent/app')).resolves.toEqual('/base/parent/app')
  })

  it('when initial directory (and ancestors) have package.json, returns topmost ancestor with one', () => {
    mockDirectoryWalker.__setMockDirectoryWalkerResults(
      '/base/parent/app',
      'package.json',
      ['/base/package.json', '/base/parent/package.json', '/base/parent/app/package.json'])

    return expect(execute('/base/parent/app')).resolves.toEqual('/base')
  })

  it('when ancestors have package.json, returns topmost ancestor with one', () => {
    mockDirectoryWalker.__setMockDirectoryWalkerResults(
      '/base/parent/app',
      'package.json',
      '/base/parent/package.json')

    return expect(execute('/base/parent/app')).resolves.toEqual('/base/parent')
  })

  it('when no package.jsons in directory hierarchy, returns undefined', () => {
    mockDirectoryWalker.__setMockDirectoryWalkerResults(
      '/base/parent/app',
      'package.json',
      [])

    return expect(execute('/base/parent/app')).resolves.toBeUndefined()
  })
})