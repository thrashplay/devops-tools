import path from 'path'

import { get, keys, map, merge, sortBy } from 'lodash'

import { generateRootTsConfig } from '../create-tsconfigs'
import { Project } from '../../model'
import fixtures from '../../__fixtures__'

jest.mock('../../fs')
const fileUtils = require('../../fs')

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
  const monorepoProject = new Project('/app', true, '/app', [
    {
      packageJson: {
        name: 'package-one',
      },
      directory: path.join('/app', 'packages', 'package-one-dir'),
      name: 'package-one',
    },
    {
      packageJson: {
        name: '@scope/package-two',
      },
      directory: path.join('/app', 'other-packages-root', 'package-two-dir'),
      name: '@scope/package-two',
    },
  ])

  const standaloneProject = new Project('/app', true, '/app', [
    {
      packageJson: {
        name: 'my-package',
      },
      directory: '/app',
      name: 'my-package',
    },
  ])

  beforeEach(() => {
    jest.clearAllMocks()
    fileUtils.__clear()
  })

  describe('when a monorepo', () => {
    // creates a mock 'tsconfig.json' file in the monorepo root, with the specified contents
    const setMockBaseTsConfig = (config: object) => {
      fileUtils.__setMockLoadJsonResults({
        '/app/tsconfig.json': config,
      })
    }

    it('extends existing tsconfig.json, when one exists', () => {
      throw new Error('not implemented')
    })

    it('does not include extends property, when no tsconfig.json exists', () => {
      throw new Error('not implemented')
    })

    it.only.each(map(forbiddenProperties, (property) => [property]))('generates error if property specified in existing tsconfig.json: %s', (property) => {
      const tsconfigWithExtraProperty = merge({}, fixtures.tsconfig.default, { [property]: 'any-value' })
      setMockBaseTsConfig(tsconfigWithExtraProperty)
      
      expect(() => {
        generateRootTsConfig(monorepoProject)
      }).toThrowError(`The tsconfig.json option '${property}' cannot be set, because it will be overriden by Thrasher.`)
    })  

    it('generates TS path mappings with expected keys', () => {
      const rootConfig = generateRootTsConfig(monorepoProject)
      const paths = get(rootConfig, ['compilerOptions', 'paths'])
  
      expect(sortBy(keys(paths))).toEqual(['@scope/package-two', 'package-one'])
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