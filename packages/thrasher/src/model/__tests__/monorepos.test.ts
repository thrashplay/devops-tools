import { getMonorepoDetectors, lerna } from '../monorepos'

jest.mock('../../fs')

jest.mock('glob')
const glob = require('glob')

const fileUtils = require('../../fs')

describe('monorepo detectors', () => {
  const EXPECTED_DIRECTORY = '/parent-directory/sub-directory'

  beforeEach(() => {
    jest.clearAllMocks()
    fileUtils.__clear()
  })

  it('contains entry for all supported structures', () => {
    const detectors = getMonorepoDetectors()
    expect(detectors).toHaveLength(1)
    expect(detectors[0]).toBe(lerna)
  })

  describe('lerna', () => {
    const lernaJsonConfig = {
      packages: [
        'packages/*',
        'globstar-test/**',
        'other/specific-package1',
      ],
    }

    it('when NO lerna.json found, DOES NOT detect monorepo', () => {
      return lerna(EXPECTED_DIRECTORY)
        .then((result) => {
          expect(result).toBeUndefined()
        })
    })

    describe('when lerna.json found', () => {
      beforeEach(() => {
        fileUtils.__setMockDirectoryWalkerResults({
          [EXPECTED_DIRECTORY]: {
            'lerna.json': ['/parent-directory/lerna.json'],
          },
        })

        fileUtils.__setMockLoadJsonResults({
          '/parent-directory/lerna.json': lernaJsonConfig,
        })

        glob.sync.mockImplementation(() => [])
      })

      it('detects monorepo', () => {
        return lerna(EXPECTED_DIRECTORY)
          .then((result) => {
            expect(result).toBeDefined()
          })
      })
  
      it('detects correct rootDir', () => {
        return lerna(EXPECTED_DIRECTORY)
          .then((result) => {
            expect(result.rootDir).toBe('/parent-directory')
          })
      })

      it('if NO package globs configured, detects NO packages', () => {
        fileUtils.__setMockLoadJsonResults({ '/parent-directory/lerna.json': {} }) // empty lerna.json
        glob.sync.mockImplementation((pattern) => {
          throw new Error(`Unexpected glob pattern: ${pattern}`)
        })

        return lerna(EXPECTED_DIRECTORY)
          .then((result) => {
            expect(result.packageDirs).toHaveLength(0)
          })
      })

      it('if package globs configured, resolves globs from right directory', () => {
        glob.sync.mockImplementation((_pattern, options) => {
          expect(options.cwd).toBe('/parent-directory')
        })
        return lerna(EXPECTED_DIRECTORY)
      })

      it('if package globs configured, detects correct packages', () => {
        glob.sync.mockImplementation((pattern) => {
          switch (pattern) {
            case 'packages/*':
              return [ 'packages/glob-one', 'packages/glob-two' ]
            case 'globstar-test/**':
              return [ 'globstar-test/middle/globstar-one', 'globstar-test/other/path/globstar-two' ]
            case 'other/specific-package1':
              return [ 'other/specific-package1' ]
            default:
              throw new Error(`Unexpected glob pattern: ${pattern}`)
          }
        })

        return lerna(EXPECTED_DIRECTORY)
          .then((result) => {
            expect(result.packageDirs).toHaveLength(5)
            expect(result.packageDirs).toContain('packages/glob-one')
            expect(result.packageDirs).toContain('packages/glob-two')
            expect(result.packageDirs).toContain('globstar-test/middle/globstar-one')
            expect(result.packageDirs).toContain('globstar-test/other/path/globstar-two')
            expect(result.packageDirs).toContain('other/specific-package1')
          })
      })
    })
  })
})

