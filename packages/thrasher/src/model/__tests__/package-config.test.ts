import fs from 'fs'

import { mocked } from 'ts-jest/utils'

import * as MockFsApi from '../../__mocks__/fs'
import { PackageConfig } from '../package-config'
import { validatePackageJson } from '../npm-package-json'
import fixtures from '../../__fixtures__'

jest.mock('fs')
jest.mock('../npm-package-json', () => ({
  ...jest.requireActual('../npm-package-json'),
  validatePackageJson: jest.fn((input) => input),
}))

const mockFs = fs as (typeof fs & typeof MockFsApi)
const mockValidatePackageJson = mocked(validatePackageJson)

describe('PackageConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFs.__clear()
    mockFs.__setMockJsonFile('/app/package.json', fixtures.packageJson.default)
  })
  
  describe('create', () => {
    it('loads package.json', () => {
      return expect(PackageConfig.create('/app'))
        .resolves.toMatchObject({ packageJson: fixtures.packageJson.default })
    })

    it('sets name from package.json', () => {
      return expect(PackageConfig.create('/app'))
        .resolves.toMatchObject({ name: fixtures.packageJson.default.name })
    })

    it('throws error, when NO package.json', () => {
      mockFs.__removeMockFile('/app/package.json')
      return expect(PackageConfig.create('/app'))
        .rejects.toThrowError()
    })

    it('throws error, when package.json is not JSON', () => {
      mockFs.__setMockFile('/app/package.json', 'any invalid JSON value')
      return expect(PackageConfig.create('/app'))
        .rejects.toThrow('Invalid package.json format: /app/package.json')
    })

    it('throws error, when package.json has invalid structure', () => {
      mockValidatePackageJson.mockImplementationOnce(() => { throw new SyntaxError('Invalid package.json format!') })
      return expect(PackageConfig.create('/app'))
        .rejects.toThrow('Invalid package.json JSON structure: /app/package.json')
    })
  })

  describe('readFile', () => {
    const expectedContents = 'expected contents of the file to read'
    let packageConfig: PackageConfig

    beforeEach(async () => {
      mockFs.__setMockFile('/app/subfolder/existing-file.json', expectedContents)
      packageConfig = await PackageConfig.create('/app')
    })

    it('throws error when file does NOT exist', () => {
      return expect(packageConfig.readFile('non-existent-file.json'))
        .rejects.toThrowError()
    })

    it('returns contents when file DOES exist', () => {
      return expect(packageConfig.readFile('subfolder/existing-file.json'))
        .resolves.toEqual(expectedContents)
    })
  })

  describe('readJsonFile', () => {
    const expectedContents = { property: 'value' }
    let packageConfig: PackageConfig

    beforeEach(async () => {
      mockFs.__setMockJsonFile('/app/subfolder/valid-file.json', expectedContents)
      mockFs.__setMockFile('/app/subfolder/invalid-file.json', 'any data that is not JSON!')
      packageConfig = await PackageConfig.create('/app')
    })

    it('throws error when file does NOT exist', () => {
      return expect(packageConfig.readJsonFile('non-existent-file.json'))
        .rejects.toThrowError()
    })

    it('throws error when file is NOT valid JSON', () => {
      return expect(packageConfig.readJsonFile('subfolder/invalid-file.json'))
        .rejects.toThrowError('File \'subfolder/invalid-file.json\' does not contain valid JSON. (In package: /app)')
    })

    it('returns file contents for valid, existing file', () => {
      return expect(packageConfig.readJsonFile('subfolder/valid-file.json'))
        .resolves.toEqual(expectedContents)
    })
  })
})