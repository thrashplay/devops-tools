import * as MockDirectoryWalkerApi from '../__mocks__/directory-walker'
import * as directoryWalker from '../directory-walker'
import { execute } from '../root-detector-lerna'

jest.mock('../directory-walker')
const mockDirectoryWalker = directoryWalker as (typeof directoryWalker & typeof MockDirectoryWalkerApi)

describe('lerna-root-detector', () => {
  beforeEach(() => {
    mockDirectoryWalker.__clear()
  })

  it('when initial directory (and no ancestors) have lerna.json and package.json, return initial directory', () => {
    mockDirectoryWalker.__setMockDirectoryWalkerResults(
      '/base/parent/app',
      'lerna.json',
      '/base/parent/app/lerna.json')
    mockDirectoryWalker.__setMockDirectoryWalkerResults(
      '/base/parent/app',
      'package.json',
      '/base/parent/app/package.json')

    return expect(execute('/base/parent/app')).resolves.toEqual('/base/parent/app')
  })

  it('when initial directory (and ancestors) have lerna.json and package.json, returns initial directory', () => {
    mockDirectoryWalker.__setMockDirectoryWalkerResults(
      '/base/parent/app',
      'lerna.json',
      ['/base/lerna.json', '/base/parent/lerna.json', '/base/parent/app/lerna.json'])
    mockDirectoryWalker.__setMockDirectoryWalkerResults(
      '/base/parent/app',
      'package.json',
      ['/base/package.json', '/base/parent/package.json', '/base/parent/app/package.json'])      

    return expect(execute('/base/parent/app')).resolves.toEqual('/base/parent/app')
  })

  it('when ancestors have lerna.json and package.json, returns lowest ancestor with both', () => {
    mockDirectoryWalker.__setMockDirectoryWalkerResults(
      '/base/parent/app',
      'lerna.json',
      ['/base/lerna.json', '/base/parent/lerna.json'])
    mockDirectoryWalker.__setMockDirectoryWalkerResults(
      '/base/parent/app',
      'package.json',
      ['/base/parent/package.json', '/base/parent/app/package.json'])      

    return expect(execute('/base/parent/app')).resolves.toEqual('/base/parent')
  })

  it('when all directories have package.json but no lerna.json, returns undefined', () => {
    mockDirectoryWalker.__setMockDirectoryWalkerResults(
      '/base/parent/app',
      'lerna.json',
      [])
    mockDirectoryWalker.__setMockDirectoryWalkerResults(
      '/base/parent/app',
      'package.json',
      ['/base/package.json', '/base/parent/package.json', '/base/parent/app/package.json'])       

    return expect(execute('/base/parent/app')).resolves.toBeUndefined()
  })

  it('when all directories have lerna.json but no package.json, returns undefined', () => {
    mockDirectoryWalker.__setMockDirectoryWalkerResults(
      '/base/parent/app',
      'lerna.json',
      ['/base/lerna.json', '/base/parent/lerna.json', '/base/parent/app/lerna.json'])       
    mockDirectoryWalker.__setMockDirectoryWalkerResults(
      '/base/parent/app',
      'package.json',
      [])

    return expect(execute('/base/parent/app')).resolves.toBeUndefined()
  })
})