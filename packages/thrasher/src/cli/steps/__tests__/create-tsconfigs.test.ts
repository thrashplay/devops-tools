import fs from 'fs'
import path from 'path'

import { get, map, merge } from 'lodash'

import * as MockFsApi from '../../../__mocks__/fs'
import { create } from '../create-tsconfigs'
import { Project, PackageConfig } from '../../../model'
import fixtures from '../../../__fixtures__'

jest.mock('fs')
const mockFs = fs as (jest.Mocked<typeof fs> & typeof MockFsApi)

const forbiddenProperties = [
  'baseUrl',
  'composite',
  'declaration',
  'isolatedModules',
  'module',
  'noEmit',
  'noEmitOnError',
  'paths',
]

describe('generateRootTsConfig', () => {
  const buildConfiguration = { initialDirectory: '/' }
  const buildStep = create()

  const monorepoProject = new Project('/app', true, '/app', [
    new PackageConfig(path.join('/app', 'packages', 'package-one-dir'), {
      name: 'package-one',
    }),
    new PackageConfig(path.join('/app', 'other-packages-root', 'package-two-dir'), {
      name: '@scope/package-two',
    }),
  ])

  const standaloneProject = new Project('/app', true, '/app', [
    new PackageConfig('/app', {
      name: 'my-package',
    }),
  ])

  beforeEach(() => {
    jest.clearAllMocks()
    mockFs.__clear()

    fs.mkdirSync('/app/.thrasher')
    fs.mkdirSync('/app/packages/package-one-dir', { recursive: true })
    fs.mkdirSync('/app/packages/package-two-dir', { recursive: true })
  })

  describe('when a monorepo', () => {
    // creates a mock 'tsconfig.json' file in the monorepo root, with the specified contents
    const setMockBaseTsConfig = (config: object) => {
      mockFs.__setMockJsonFile('/app/tsconfig.json', config)
    }

    it.only('project-level config extends existing tsconfig.json, when one exists', async () => {
      await buildStep.execute(buildConfiguration, monorepoProject)
      const generatedTsConfig = mockFs.__getWrittenJsonFileContents('/app/.thrasher/tsconfig.json')
      expect(generatedTsConfig).toBeDefined()
      expect(generatedTsConfig.extends).toBe('../tsconfig.json')
    })

    it('does not include extends property, when no tsconfig.json exists', async () => {
      mockFs.__removeMockFile('/app/tsconfig.json')
      await buildStep.execute(buildConfiguration, monorepoProject)
      const generatedTsConfig = mockFs.__getWrittenJsonFileContents('/app/.thrasher/tsconfig.json')
      expect(generatedTsConfig).toBeDefined()
      expect(generatedTsConfig.extends).toBe('../tsconfig.json')
    })

    it('does the right thing, if tsconfig.json cannot be parsed', () => {
      throw new Error('not implemented')
    })

    it.each(map(forbiddenProperties, (property) => [property]))('generates error if property specified in existing tsconfig.json: %s', (property) => {
      const tsconfigWithExtraProperty = merge({}, fixtures.tsconfig.default, { [property]: 'any-value' })
      setMockBaseTsConfig(tsconfigWithExtraProperty)

      return expect(buildStep.execute(buildConfiguration, monorepoProject))
        .rejects.toThrowError(`The tsconfig.json option '${property}' cannot be set, because it will be overridden by Thrasher.`)
    })

    it('handles multiple errors in tsconfig.json', () => {
      throw new Error('not implemented')
    })

    it('generates TS path mappings with expected keys', async () => {
      await buildStep.execute(buildConfiguration, monorepoProject)
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2)
      expect(mockFs.__getWrittenJsonFileContents('/app/packages/package-one-dir/tsconfig.json')).toMatchObject({})
      mockFs.__assertJsonFileWasWritten('/app/packages/package-one-dir/tsconfig.json', {
        extends: 'abc/not/implemented',
        compilerOptions: {
          declarationDir: './dist/module',
          outDir: './dist/module',
          rootDir: './src',
        },
        include: ['src'],
      })
    })

    it('generates TS path mappings for non-scoped packages', () => {
      const rootConfig = generateRootTsConfig(monorepoProject)
      const paths = get(rootConfig, ['compilerOptions', 'paths'])

      expect(get(paths, 'package-one')).toBe('packages/package-one-dir/src')
    })

    it('generates TS path mappings for scoped packages', () => {
      const rootConfig = generateRootTsConfig(monorepoProject)
      const paths = get(rootConfig, ['compilerOptions', 'paths'])

      expect(get(paths, '@scope/package-two')).toBe('other-packages-root/package-two-dir/src')
    })
  })

  describe('when a standalone package', () => {
    it('extends existing tsconfig.json, when one exists', () => {
      throw new Error('not implemented')
    })

    it('does not include extends property, when no tsconfig.json exists', () => {
      throw new Error('not implemented')
    })

    it('generates no path mappings', () => {
      const rootConfig = generateRootTsConfig(standaloneProject)
      const paths = get(rootConfig, ['compilerOptions', 'paths'])
      expect(paths).toBeUndefined()
    })
  })

  describe('includes static properties', () => {
    const rootConfig = generateRootTsConfig(monorepoProject)

    it('baseUrl', () => {
      expect(get(rootConfig, ['compilerOptions', 'baseUrl'])).toBe('.')
    })

    it('composite', () => {
      expect(get(rootConfig, ['compilerOptions', 'composite'])).toBe(true)
    })

    it('declaration', () => {
      expect(get(rootConfig, ['compilerOptions', 'declaration'])).toBe(true)
    })

    it('isolatedModules', () => {
      expect(get(rootConfig, ['compilerOptions', 'isolatedModules'])).toBe(true)
    })

    it('module', () => {
      expect(get(rootConfig, ['compilerOptions', 'module'])).toBe('es6')
    })

    it('noEmit', () => {
      expect(get(rootConfig, ['compilerOptions', 'noEmit'])).toBe(true)
    })

    it('noEmitOnError', () => {
      expect(get(rootConfig, ['compilerOptions', 'noEmitOnError'])).toBe(true)
    })
  })
})
