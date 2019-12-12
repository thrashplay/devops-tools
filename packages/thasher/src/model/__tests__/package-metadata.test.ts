import path from 'path'

import { map, reduce } from 'lodash'

import { createPackageMetadataFactory } from '../package-metadata'

jest.mock('../../fs/file-utils')
const fileUtils = require('../../fs/file-utils')

const data = {
  rootDir: '/app',
  packages: [
    {
      directory: path.join('/app', 'packages', 'package-one-dir'),
      name: 'package-one',
      packageJson: {
        name: 'package-one',
      },
    },
    {
      directory: path.join('/app', 'packages', 'package-two-dir'),
      name: 'package-two',
      packageJson: {
        name: 'package-two',
      },
    },
  ],
}

describe('createPackageMetadata', () => {
  beforeEach(() => {
    const mockPackageJsonResults = reduce(data.packages, (accumulator, config) => {
      return {
        ...accumulator,
        [path.join(config.directory, 'package.json')]: config.packageJson,
      }
    }, {})
    fileUtils.__setMockLoadJsonResults(mockPackageJsonResults)
  })

  it.each(map(
    data.packages, 
    (config) => [config.directory, config.directory, config.name, config.packageJson],
  ))('metadata is correct content: %s', async (packageDirectory: string, directory: string, name: string, packageJson: string) => {
    const factory = createPackageMetadataFactory()

    const metadata = await factory.createPackageMetadata(packageDirectory)
    expect(metadata).toEqual({
      config: packageJson,
      directory,
      name,
    })
  })
})