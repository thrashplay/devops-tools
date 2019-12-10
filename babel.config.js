const { get, merge } = require('lodash')

const VALID_ENVIRONMENTS = [
  'google-cloud-function',
  'library',
  'script',
  'test',
]

const defaultConfiguration = {
  modules: false,
  node: 'current',
}
const configurations = {
  test: {
    modules: 'commonjs',
  },
  'google-cloud-function': {
    modules: 'commonjs',
    node: '8.16.2',
  },
}

const getEnvironmentConfiguration = (environment) => {
  return merge({}, defaultConfiguration, get(configurations, environment, {}))
}

module.exports = api => {
  const env = api.env()
  if (!VALID_ENVIRONMENTS.includes(env)) {
    throw new Error(`Invalid environment: ${env}`)
  }

  const config = getEnvironmentConfiguration(env)

  const presets = [
    [
      '@babel/preset-env',
      {
        corejs: 3,
        modules: config.modules,
        debug: false,
        targets: {
          node: config.node,
        },
        useBuiltIns: 'usage',
      },
    ],
    '@babel/preset-typescript',
  ]

  const plugins = [
    '@babel/proposal-class-properties',
    '@babel/proposal-object-rest-spread',
    '@babel/proposal-export-default-from',
  ]

  return {
    ignore: [/node_modules/],
    plugins,
    presets,
  }
} 