/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/*
 * Adapted from: https://github.com/react-native-community/cli/blob/c674bffc2c9efff262928d5e493254b64cf77d7e/__mocks__/path.js
 */

const mockPath = {}

function reset(platform) {
  Object.assign(mockPath, jest.requireActual('path')[platform])
}

mockPath.mock = { reset }

reset('posix')

module.exports = mockPath