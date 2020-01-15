import { map, merge } from 'lodash'
import { MockFs } from 'thrasher/src/__mocks__/fs'

import { create } from '../create-tsconfigs'
import { Project, PackageConfig } from '../../../model'
import fixtures from '../../../__fixtures__'

import { assertJsonFile } from './fs-test-utils'

jest.mock('fs')
jest.mock('path')
const fs = require('fs') as MockFs
const path = require('path')

const forbiddenProperties = [
  'baseUrl',
  'composite',
  'declaration',
  'declarationDir',
  'isolatedModules',
  'module',
  'noEmit',
  'noEmitOnError',
  'outDir',
  'paths',
  'rootDir',
]

const createMonorepoConfigTests = (cwd: string, projectRootDir: string) => () => {
  const packageConfigs = [
    new PackageConfig(path.join(projectRootDir, 'packages', 'package-one-dir'), {
      name: 'package-one',
      dependencies: {
        '@scope/package-two': '1.0.0',
      },
    }),
    new PackageConfig(path.join(projectRootDir, 'other-packages-root', 'package-two-dir'), {
      name: '@scope/package-two',
    }),
  ]

  const buildConfiguration = { initialDirectory: cwd }
  const buildStep = create()
  const project = new Project(cwd, true, projectRootDir, packageConfigs)

  describe('root .thrasher/tsconfig.json file', () => {
    const rootTsConfig = fixtures.tsconfig.default
    const rootTsConfigString = JSON.stringify(rootTsConfig, null, 2)

    it('extends existing project-level tsconfig.json, when one exists', async () => {
      fs.writeFileSync(path.join(projectRootDir, 'tsconfig.json'), rootTsConfigString)
  
      await buildStep.execute(buildConfiguration, project)
      assertJsonFile(path.resolve(projectRootDir, '.thrasher', 'tsconfig.json'), (contents) => {
        expect(contents.extends).toBe('../tsconfig.json')
      })
    })
  
    it('does not include extends property, when no project-level tsconfig.json exists', async () => {
      await buildStep.execute(buildConfiguration, project)
      assertJsonFile(path.resolve(projectRootDir, '.thrasher', 'tsconfig.json'), (contents) => {
        expect(contents.extends).toBeUndefined()
      })
    })
  
    it('throws an error when existing project-level tsconfig.json cannot be parsed', async () => {
      fs.writeFileSync(path.join(projectRootDir, 'tsconfig.json'), '{ garbage-that-isn\'t valid json: 132 } 12: 5')
      await expect(buildStep.execute(buildConfiguration, project))
        .rejects.toThrowError()
    })
  
    describe('user-supplied forbidden properties generate an error', () => {
      it.each(map(forbiddenProperties, (property) => [property]))('%s', async (property) => {
        const tsconfigWithForbiddenProperty = merge({}, fixtures.tsconfig.default, { [property]: 'any-value' })
        fs.writeFileSync(path.join(projectRootDir, 'tsconfig.json'), JSON.stringify(tsconfigWithForbiddenProperty, null, 2))
    
        await expect(buildStep.execute(buildConfiguration, project))
          .rejects.toThrowError(`Error in ${path.join(projectRootDir, 'tsconfig.json')}: The tsconfig.json option '${property}' cannot be set, because it will be overridden by Thrasher.`)
      })
    })
  
    it.skip('includes correct project-level tsconfig', () => {
      throw new Error('not implemented')
    })
  })

  describe('package-level .thrasher/tsconfig.json files', () => {
    const packageTsConfig = {
      compilerOptions: {
        allowJs: true,
      },
    }
    const packageTsConfigString = JSON.stringify(packageTsConfig, null, 2)

    describe.each(
      map(packageConfigs, (packageConfig) => [packageConfig.name, packageConfig.directory]),
    )('%s', (_packageName: string, packagePath: string) => {
      it('extends existing package-level tsconfig.json, when one exists', async () => {
        fs.writeFileSync(path.resolve(packagePath, 'tsconfig.json'), packageTsConfigString)
  
        await buildStep.execute(buildConfiguration, project)
        assertJsonFile(path.join(packagePath, '.thrasher', 'tsconfig.json'), (contents) => {
          expect(contents.extends).toEqual('../tsconfig.json')
        })
      })
  
      it.each([
        path.join(packagePath, '.thrasher', 'tsconfig.json'),
        '../../../.thrasher/tsconfig.json',
      ])('extends project-level tsconfig.json, if no package-level tsconfig.json exists', async (path: string, extendsPath: string) => {
        await buildStep.execute(buildConfiguration, project)
        assertJsonFile(path, (contents) => {
          expect(contents.extends).toEqual(extendsPath)
        })
      })
  
      it('throws an error when existing package-level tsconfig.json cannot be parsed', async () => {
        fs.writeFileSync(path.resolve(packagePath, 'tsconfig.json'), '{ garbage-that-isn\'t valid json: 132 } 12: 5')
        await expect(buildStep.execute(buildConfiguration, project))
          .rejects.toThrowError()
      })
  
      it.skip(' an error when existing package-level tsconfig.json does not extend the project-level tsconfig.json', async () => {
        throw new Error('not implemented')
      })
  
      it('include correct package-level tsconfig compiler options', async () => {
        await buildStep.execute(buildConfiguration, project)
        assertJsonFile(path.join(packagePath, '.thrasher', 'tsconfig.json'), (contents) => {
          expect(contents.compilerOptions).toEqual({
            declarationDir: '../lib',
            outDir: '../lib',
            rootDir: '../src',
          })
        })
      })
  
      it('include correct package-level tsconfig include array', async () => {
        await buildStep.execute(buildConfiguration, project)
        assertJsonFile(path.join(packagePath, '.thrasher', 'tsconfig.json'), (contents) => {
          expect(contents.include).toEqual(['../src'])
        })
      })
    })

    it.each([
      [
        'package-one',
        'c:\\app\\packages\\package-one-dir\\.thrasher\\tsconfig.json',
        [
          {
            path: '../../../other-packages-root/package-two-dir/.thrasher',
          },
        ],
      ],
      [
        'package-two',
        'c:\\app\\other-packages-root\\package-two-dir\\.thrasher\\tsconfig.json',
        undefined,
      ],
    ])('include correct tsconfig references: %s', async (_packageName: string, path: string, references?: object[]) => {
      await buildStep.execute(buildConfiguration, project)
      assertJsonFile(path, (contents) => {
        expect(contents.references).toEqual(references)
      })
    })

    describe('user-supplied forbidden properties generate an error', () => {
      it.each(map(forbiddenProperties, (property) => [property]))('%s', async (property) => {
        const tsconfigWithForbiddenProperty = merge({}, packageTsConfig, { [property]: 'any-value' })
        for (let packageConfig of packageConfigs) {
          const tsconfigPath = path.join(packageConfig.directory, 'tsconfig.json')
          fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfigWithForbiddenProperty, null, 2))
          await expect(buildStep.execute(buildConfiguration, project))
            .rejects.toThrowError(`Error in ${tsconfigPath}: The tsconfig.json option '${property}' cannot be set, because it will be overridden by Thrasher.`)
          fs.unlinkSync(tsconfigPath)
        }
      })
    })
  })
}

const createStandaloneProjectConfigTests = (cwd: string, projectRootDir: string) => () => {
  const packageConfig = new PackageConfig(projectRootDir, {
    name: 'package-one',
  })

  const buildConfiguration = { initialDirectory: cwd }
  const buildStep = create()

  const project = new Project(cwd, true, projectRootDir, [packageConfig])

  const rootTsConfig = fixtures.tsconfig.default
  const rootTsConfigString = JSON.stringify(rootTsConfig, null, 2)

  it('extends existing tsconfig.json, when one exists', async () => {
    fs.writeFileSync(path.join(projectRootDir, 'tsconfig.json'), rootTsConfigString)

    await buildStep.execute(buildConfiguration, project)
    assertJsonFile(path.resolve(projectRootDir, '.thrasher', 'tsconfig.json'), (contents) => {
      expect(contents.extends).toBe('../tsconfig.json')
    })
  })

  it('does not include extends property, when no tsconfig.json exists', async () => {
    await buildStep.execute(buildConfiguration, project)
    assertJsonFile(path.resolve(projectRootDir, '.thrasher', 'tsconfig.json'), (contents) => {
      expect(contents.extends).toBeUndefined()
    })
  })

  it('throws an error when existing tsconfig.json cannot be parsed', async () => {
    fs.writeFileSync(path.join(projectRootDir, 'tsconfig.json'), '{ garbage-that-isn\'t valid json: 132 } 12: 5')
    await expect(buildStep.execute(buildConfiguration, project))
      .rejects.toThrowError()
  })

  it.skip('includes correct project-level tsconfig', () => {
    throw new Error('not implemented')
  })

  describe('user-supplied forbidden properties generate an error', () => {
    it.each(map(forbiddenProperties, (property) => [property]))('%s', async (property) => {
      const tsconfigWithForbiddenProperty = merge({}, fixtures.tsconfig.default, { [property]: 'any-value' })
      fs.writeFileSync(path.join(projectRootDir, 'tsconfig.json'), JSON.stringify(tsconfigWithForbiddenProperty, null, 2))

      await expect(buildStep.execute(buildConfiguration, project))
        .rejects.toThrowError(`Error in ${path.join(projectRootDir, 'tsconfig.json')}: The tsconfig.json option '${property}' cannot be set, because it will be overridden by Thrasher.`)
    })
  })
}

// all this commented out stuff needs to be done still
// and skipped tests unskipped

// it('generates TS path mappings with expected keys', async () => {
//   await buildStep.execute(buildConfiguration, monorepoProject)
//   const tsconfigContents = fs.readFileSync('/app/packages/package-one-dir/tsconfig.json', 'utf8')
//   expect(tsconfigContents).toEqual({
//     extends: 'abc/not/implemented',
//     compilerOptions: {
//       declarationDir: './dist/module',
//       outDir: './dist/module',
//       rootDir: './src',
//     },
//     include: ['src'],
//   })
// })

// it('generates TS path mappings for non-scoped packages', () => {
//   const rootConfig = generateRootTsConfig(monorepoProject)
//   const paths = get(rootConfig, ['compilerOptions', 'paths'])

//   expect(get(paths, 'package-one')).toBe('packages/package-one-dir/src')
// })

// it('generates TS path mappings for scoped packages', () => {
//   const rootConfig = generateRootTsConfig(monorepoProject)
//   const paths = get(rootConfig, ['compilerOptions', 'paths'])

//   expect(get(paths, '@scope/package-two')).toBe('other-packages-root/package-two-dir/src')
// })

// describe('includes static properties', () => {
//   const rootConfig = generateRootTsConfig(monorepoProject)

//   it('baseUrl', () => {
//     expect(get(rootConfig, ['compilerOptions', 'baseUrl'])).toBe('.')
//   })

//   it('composite', () => {
//     expect(get(rootConfig, ['compilerOptions', 'composite'])).toBe(true)
//   })

//   it('declaration', () => {
//     expect(get(rootConfig, ['compilerOptions', 'declaration'])).toBe(true)
//   })

//   it('isolatedModules', () => {
//     expect(get(rootConfig, ['compilerOptions', 'isolatedModules'])).toBe(true)
//   })

//   it('module', () => {
//     expect(get(rootConfig, ['compilerOptions', 'module'])).toBe('es6')
//   })

//   it('noEmit', () => {
//     expect(get(rootConfig, ['compilerOptions', 'noEmit'])).toBe(true)
//   })

//   it('noEmitOnError', () => {
//     expect(get(rootConfig, ['compilerOptions', 'noEmitOnError'])).toBe(true)
//   })
// })

describe('win32', () => {
  const cwd = path.join('c:', 'app')
  const projectRoot = path.join('c:', 'app')

  beforeEach(() => {
    fs.__reset('win32')

    fs.mkdirSync('c:\\app', { recursive: true })
    fs.mkdirSync('c:\\app\\packages\\package-one-dir', { recursive: true })
    fs.mkdirSync('c:\\app\\other-packages-root\\package-two-dir', { recursive: true })
  })

  describe('monorepo project', createMonorepoConfigTests(cwd, projectRoot))
  describe('standalone project', createStandaloneProjectConfigTests(cwd, projectRoot))
})

describe('posix', () => {
  const cwd = path.join('/', 'app')
  const projectRoot = path.join('/', 'app')

  beforeEach(() => {
    fs.__reset('posix')

    fs.mkdirSync('/app', { recursive: true })
    fs.mkdirSync('/app/packages/package-one-dir', { recursive: true })
    fs.mkdirSync('/app/other-packages-root/package-two-dir', { recursive: true })
  })

  describe('monorepo project', createMonorepoConfigTests(cwd, projectRoot))
  describe('standalone project', createStandaloneProjectConfigTests(cwd, projectRoot))
})
