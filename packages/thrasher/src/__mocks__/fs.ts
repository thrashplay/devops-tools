import path from 'path'

import { get, isFunction, isNil, merge } from 'lodash'
import MemoryFS from 'metro-memory-fs'

let fs

// function setMockFilesystem(object, platform) {
//   reset(platform);
//   const root = platform === 'win32' ? 'c:\\' : '/';
//   mockDir(root, {...object});
//   return root;
// }

// function mockDir(dirPath, desc) {
//   for (const entName in desc) {
//     const ent = desc[entName];
//     const entPath = path.join(dirPath, entName);
//     if (typeof ent === 'string' || ent instanceof Buffer) {
//       fs.writeFileSync(entPath, ent);
//       continue;
//     }
//     if (typeof ent !== 'object') {
//       throw new Error(require('util').format('invalid entity:', ent));
//     }
//     if (ent.SYMLINK != null) {
//       fs.symlinkSync(ent.SYMLINK, entPath);
//       continue;
//     }
//     fs.mkdirSync(entPath);
//     mockDir(entPath, ent);
//   }
// }

function reset(platform: 'win32' | 'posix' = 'posix', cwdOverride?: string ) {
  const resetPath = get(path, ['mock', 'reset'])
  if (!isFunction(resetPath)) {
    throw new Error('to use this "fs" module mock, you must also mock the "path" module')
  }
  resetPath(platform)

  const cwd = !isNil(cwdOverride)
    ? cwdOverride
    : platform === 'win32' ? 'c:\\' : '/'
  
  fs = new MemoryFS({
    platform, 
    cwd: () => cwd,
  })
  merge(mockFs, fs)
}

const mockHelpers = {
  __reset: reset,
}

const mockFs: any = {}
merge(mockFs, mockHelpers)

reset()

export type MockFs = MemoryFS & typeof mockHelpers

module.exports = mockFs