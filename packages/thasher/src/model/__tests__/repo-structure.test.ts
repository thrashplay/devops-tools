import { RepoStructure } from '../repo-structure'

describe('class RepoStrcuture', () => {
  describe('repo type detection', () => {
    it('when packageDirs only contains rootDir, returns standalone repo', () => {
      const repo = new RepoStructure('/the-root', ['/the-root'])
      expect(repo.isMonorepo).toBe(false)
      expect(repo.isStandalone).toBe(true)
    })

    it.each([
      [[], true],
      [['/the-root', '/the-other-root'], true],
    ])('when packageDirs.length is not 1, returns monorepo', (packageDirs: string[], isMonorepo: boolean) => {
      const repo = new RepoStructure('/the-root', packageDirs)
      expect(repo.isMonorepo).toBe(isMonorepo)
      expect(repo.isStandalone).toBe(!isMonorepo)
    })
  })
})