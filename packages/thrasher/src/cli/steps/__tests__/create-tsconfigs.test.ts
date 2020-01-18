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

    it('includes correct project-level tsconfig', async () => {
      await buildStep.execute(buildConfiguration, project)
      assertJsonFile(path.resolve(projectRootDir, '.thrasher', 'tsconfig.json'), (contents) => {
        expect(contents.compilerOptions).toStrictEqual({
          baseUrl: '.',
          composite: true,
          declaration: true,
          isolatedModules: true,
          module: 'es6',
          noEmit: true,
          noEmitOnError: true,
        })
      })
    })
  })

  describe('package-level .thrasher/tsconfig.json files', () => {
    const packageTsConfig = {
      extends: '../../../.thrasher/tsconfig.json',
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
  
      it('extends project-level tsconfig.json, if no package-level tsconfig.json exists', async () => {
        const tsconfigPath = path.join(packagePath, '.thrasher', 'tsconfig.json')
        const expectedExtendsPath = '../../../.thrasher/tsconfig.json'
        await buildStep.execute(buildConfiguration, project)
        assertJsonFile(tsconfigPath, (contents) => {
          expect(contents.extends).toEqual(expectedExtendsPath)
        })
      })

      it('throws an error when existing package-level tsconfig.json cannot be parsed', async () => {
        fs.writeFileSync(path.resolve(packagePath, 'tsconfig.json'), '{ garbage-that-isn\'t valid json: 132 } 12: 5')
        await expect(buildStep.execute(buildConfiguration, project))
          .rejects.toThrowError()
      })
     
      it.each([
        ['wrong extends path', { extends: '../the/wrong/path/tsconfig.json' }],
        ['no extends path', { }],
      ])('throws an error when existing package-level tsconfig.json does not extend the project-level tsconfig.json: %s', async (_testName: string, tsconfig: object) => {
        fs.writeFileSync(path.join(packagePath, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2))

        const expectedError = `Error in ${path.join(packagePath, 'tsconfig.json')}: The 'extends' option must be set, and must reference the Thrasher-generated root configuration: ../../../.thrasher/tsconfig.json`
        await expect(buildStep.execute(buildConfiguration, project)).rejects.toThrowError(expectedError)
      })

      it('include correct package-level tsconfig compiler options', async () => {
        await buildStep.execute(buildConfiguration, project)
        assertJsonFile(path.join(packagePath, '.thrasher', 'tsconfig.json'), (contents) => {
          expect(contents.compilerOptions).toStrictEqual({
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

    // this test assumes package '0' depends on package '1', and package '1' has no dependencies
    it.each([
      [
        packageConfigs[0].name,
        packageConfigs[0],
        [
          {
            path: '../../../other-packages-root/package-two-dir/.thrasher',
          },
        ],
      ],
      [
        packageConfigs[1].name,
        packageConfigs[1],
        undefined,
      ],
    ])('include correct tsconfig references: %s', async (_packageName: string, packageConfig: PackageConfig, references?: object[]) => {
      await buildStep.execute(buildConfiguration, project)
      assertJsonFile(path.join(packageConfig.directory, '.thrasher', 'tsconfig.json'), (contents) => {
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

  const project = new Project(cwd, false, projectRootDir, [packageConfig])

  const rootTsConfig = fixtures.tsconfig.default
  const rootTsConfigString = JSON.stringify(rootTsConfig, null, 2)

  it('extends existing tsconfig.json, when one exists', async () => {
    fs.writeFileSync(path.join(projectRootDir, 'tsconfig.json'), rootTsConfigString)

    await buildStep.execute(buildConfiguration, project)
    assertJsonFile(path.resolve(projectRootDir, '.thrasher', 'tsconfig.json'), (contents) => {
      expect(contents.extends).toBe('../tsconfig.json')
    })
  })

  it('throws an error when existing tsconfig.json cannot be parsed', async () => {
    fs.writeFileSync(path.join(projectRootDir, 'tsconfig.json'), '{ garbage-that-isn\'t valid json: 132 } 12: 5')
    await expect(buildStep.execute(buildConfiguration, project))
      .rejects.toThrowError()
  })

  it('does not include extends property, when no tsconfig.json exists', async () => {
    await buildStep.execute(buildConfiguration, project)
    assertJsonFile(path.resolve(projectRootDir, '.thrasher', 'tsconfig.json'), (contents) => {
      expect(contents.extends).toBeUndefined()
    })
  })

  it('include correct standalone tsconfig compiler options', async () => {
    await buildStep.execute(buildConfiguration, project)
    assertJsonFile(path.join(projectRootDir, '.thrasher', 'tsconfig.json'), (contents) => {
      expect(contents.compilerOptions).toStrictEqual({
        baseUrl: '.',
        composite: true,
        declaration: true,
        declarationDir: '../lib',
        isolatedModules: true,
        module: 'es6',
        noEmit: true,
        noEmitOnError: true,
        outDir: '../lib',
        rootDir: '../src',
      })
    })
  })

  it('include correct tsconfig include array', async () => {
    await buildStep.execute(buildConfiguration, project)
    assertJsonFile(path.join(projectRootDir, '.thrasher', 'tsconfig.json'), (contents) => {
      expect(contents.include).toEqual(['../src'])
    })
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
