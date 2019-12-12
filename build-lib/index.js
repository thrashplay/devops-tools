const { get, merge } = require('lodash')

const configurations = {
  'google-cloud-function': {
    babel: {
      presets: {
        '@babel/preset-env': (defaultOptions) => merge({}, defaultOptions, {
          targets: {
            node: '8.16.2',
          },
        }),
      },
    },
  },
  'node-library': {
    babel: {
      presets: {
        '@babel/preset-env': (defaultOptions) => merge({}, defaultOptions, {
          modules: 'commonjs',
        }),
      },
    },
    webpack: {
      skip: true,
    },
  },
}

const getConfiguration = () => {
  return get(configurations, getOutputType(), {})
}

const getPackageJson = () => require(`${process.cwd()}/package.json`)

const getOutputType = () => {
  return get(getPackageJson(), 'thrashpack.outputType', 'node-library')
}

exports.configurations = configurations
exports.getConfiguration = getConfiguration
exports.getOutputType = getOutputType