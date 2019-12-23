
import path from 'path'

import { each, find, map } from 'lodash'

import { PackageConfig } from '../../model'

import { createProjectFactory, Project } from '..'

const data = {
  monorepo: {
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
  },
  standalone: {
    rootDir: '/test-app',
    packages: [
      {
        directory: '/test-app',
        name: 'test-app',
        packageJson: {
          name: 'test-app',
        },
      },
    ],
  },
}

describe('class Project', () => {
  it('can be constructed', () => {
    expect(new Project('/any-dir', true, '/any-dir', [])).toBeDefined
  })
})

describe('createProject', () => {
  describe('when a monorepo', () => {
    // MonorepoDetector that always detects a monorepo, rooted at fromDirectory, with two packages
    const alwaysMonorepoDetector = (_fromDirectory: string) => Promise.resolve({
      rootDir: data.monorepo.rootDir,
      packageDirs: map(data.monorepo.packages, (packageConfig) => packageConfig.directory),
    })

    const factory = createProjectFactory({ 
      monorepoDetectors: [alwaysMonorepoDetector],
      packageConfigFactory: {
        createPackageConfig: (packageDirectory: string) => {
          const packageData = find(data.monorepo.packages, ['directory', packageDirectory])

          return Promise.resolve({
            config: packageData.packageJson,
            directory: packageData.directory,
            name: packageData.name,
          } as PackageMetadata) 
        },
      },
    })

    let project

    beforeEach(async () => {
      project = await factory.createProject(data.monorepo.rootDir)
    })

    describe('getPackageFromDir', () => {
      it('when directory not in project, returns undefined', () => {
        expect(project.getPackageFromDir('/any/dir/not/in/project')).toBeUndefined()
      })

      it('when directory is in project, returns undefined', () => {
        const result = project.getPackageFromDir(data.monorepo.packages[0].directory)
        expect(result).toEqual({
          config: {
            name: data.monorepo.packages[0].name,
          },
          directory: data.monorepo.packages[0].directory,
          name: data.monorepo.packages[0].name,
        })
      })
    })

    describe('packagesToBuild', () => {
      it('when directory not in project, returns empty array', async () => {
        project = await factory.createProject('/any/dir/not/in/project')
        expect(project.packagesToBuild).toHaveLength(0)
      })

      it('when directory is a package directory, returns only that package', async () => {
        project = await factory.createProject(data.monorepo.packages[0].directory)
        expect(project.packagesToBuild).toEqual([{
          config: {
            name: data.monorepo.packages[0].name,
          },
          directory: data.monorepo.packages[0].directory,
          name: data.monorepo.packages[0].name,
        }])
      })

      it('when directory is the monorepo root, returns all packages', async() => {
        project = await factory.createProject(data.monorepo.rootDir)
        expect(project.packagesToBuild).toEqual([
          {
            config: {
              name: data.monorepo.packages[0].name,
            },
            directory: data.monorepo.packages[0].directory,
            name: data.monorepo.packages[0].name,
          },
          {
            config: {
              name: data.monorepo.packages[1].name,
            },
            directory: data.monorepo.packages[1].directory,
            name: data.monorepo.packages[1].name,
          },
        ])
      })
    })

    it('isMonorepo flag is true', async () => {
      expect(project.isMonorepo).toBe(true)
    })

    it('has package for each detected package directory', async () => {
      expect(project.packages).toHaveLength(2)
    })

    it('has correct properties for each package', async () => {
      each(project.packages, (pkg, index) => { 
        const expectedPackage = data.monorepo.packages[index]
        expect(pkg.name).toEqual(expectedPackage.name) 
        expect(pkg.directory).toEqual(expectedPackage.directory) 
      })
    })

    it('has correct package.json metadata for each package', async () => {
      each(project.packages, (pkg, index) => { expect(pkg.config).toEqual(data.monorepo.packages[index].packageJson) })
    })
  })

  describe('when a standalone project', () => {
    // MonorepoDetector that always detects a standalone repo (i.e. undefined monorepo)
    const alwaysStandaloneDetector = (fromDirectory: string) => Promise.resolve(undefined)

    const factory = createProjectFactory({ 
      monorepoDetectors: [alwaysStandaloneDetector],
      packageMetadataFactory: {
        createPackageMetadata: (packageDirectory: string) => {
          const packageData = find(data.standalone.packages, ['directory', packageDirectory])

          return Promise.resolve({
            config: packageData.packageJson,
            directory: packageData.directory,
            name: packageData.name,
          } as PackageMetadata) 

        },
      },
    })

    let project

    beforeEach(async () => {
      project = await factory.createProject(data.standalone.rootDir)
    })

    describe('getPackageFromDir', () => {
      it('when directory not standalone project dir, returns undefined', () => {
        expect(project.getPackageFromDir('/any/dir/not/in/project')).toBeUndefined()
      })

      it('when directory is standalone project dir, returns package', () => {
        const result = project.getPackageFromDir(data.standalone.packages[0].directory)
        expect(result).toEqual({
          config: {
            name: data.standalone.packages[0].name,
          },
          directory: data.standalone.packages[0].directory,
          name: data.standalone.packages[0].name,
        })
      })
    })

    describe('packagesToBuild', () => {
      it('when directory is the package directory, returns only that package', async () => {
        project = await factory.createProject(data.standalone.packages[0].directory)
        expect(project.packagesToBuild).toEqual([{
          config: {
            name: data.standalone.packages[0].name,
          },
          directory: data.standalone.packages[0].directory,
          name: data.standalone.packages[0].name,
        }])
      })
    })

    it('when initialDir != projectRootDir, an error is thrown', () => {
      expect(() => new Project('/not-project-root', false, '/project-root', []))
        .toThrowError('For standalone projects, the initialDir must equal the projectRootDir.')
    })

    it('isMonorepo flag is false', async () => {
      expect(project.isMonorepo).toBe(false)
    })

    it('has exactly one package', async () => {
      expect(project.packages).toHaveLength(1)
    })

    it('has correct properties for each package', async () => {
      each(project.packages, (pkg, index) => { 
        const expectedPackage = data.standalone.packages[index]
        expect(pkg.name).toEqual(expectedPackage.name) 
        expect(pkg.directory).toEqual(expectedPackage.directory) 
      })
    })

    it('has correct package.json metadata', async () => {
      each(project.packages, (pkg, index) => { expect(pkg.config).toEqual(data.standalone.packages[index].packageJson) })
    })
  })
})