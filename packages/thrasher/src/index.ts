import { isNil } from 'lodash'

import { run } from './cli'

export * from './model'

// monorepoRoot: undefined | string = root of monorepo, or undefined if not in a monorepo
// packageDir: string = directory of package being processed

// const currentPackageDir = pkgDir.sync()

export const getMonorepoRoot = (): string => {
  return ''
}

export const isMonorepo = () => {
  return isNil(getMonorepoRoot())
}

;(async () => {
  run()
})()