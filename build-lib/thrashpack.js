const { get } = require('lodash')
const shell = require('shelljs')

const { getConfiguration } = require('.')

const exec = (...commandParts) => {
  const result = shell.exec(commandParts.map((part) => `"${part}"`).join(' '), { fatal: true })
  if (result.code !== 0) {
    process.exit(1)
  }
}

;(() => {
  const configuration = getConfiguration()
  const skipWebpack = get(configuration, 'webpack.skip', false)

  if (skipWebpack) {
    exec('yarn', '--silent', 'babel', '--root-mode', 'upward', 'src', '--out-dir', 'dist', '--extensions', '.ts,.tsx,.js,.jsx')
  } else {
    exec('yarn', '--silent', 'webpack', '--env.name', 'dev')
  }
})()

