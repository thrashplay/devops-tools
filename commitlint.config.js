const fs = require('fs')
const path = require('path')

const getPackages = () => {
  return fs.readdirSync(path.resolve('packages'))
    .filter(name => !name.startsWith('.'))
}

module.exports = {
  extends: [
    '@commitlint/config-conventional',
  ],
  rules: {
    'body-max-line-length': [2, 'always', 100],
    'footer-max-line-length': [2, 'always', 100],
    'header-full-stop': [2, 'always', '.'],
    'header-max-length': [2, 'always', 100],
    'scope-case': [2, 'always', 'kebab-case'],
    'scope-enum': [2, 'always', getPackages().concat(['publish'])],
    'subject-case': [2, 'always', 'sentence-case'],
    'subject-full-stop': [2, 'always', '.'],
  },
}

