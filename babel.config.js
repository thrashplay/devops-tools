const { get, identity, isEmpty } = require('lodash')

const { configurations, getOutputType } = require('./build-lib/index')

const defaults = {
  presets: {
    '@babel/preset-env': {
      corejs: 3,
      modules: false,
      debug: false,
      targets: {
        node: 'current',
      },
      useBuiltIns: 'usage',
    },
  },
}

module.exports = api => {
  const outputType = getOutputType()
  api.cache(() => outputType)

  const createConfig = (name, defaultSet, customizers) => {
    const defaultValues = get(defaultSet, name, {})
    const customizer = get(customizers, name, identity)
    const options = customizer(defaultValues)
    return (isEmpty(options)) ? name : [name, options]
  }
  const createPluginConfig = (name) => {
    return createConfig(name, get(defaults, 'plugins'), get(configurations, `${outputType}.babel.plugins`))
  }
  const createPresetConfig = (name) => {
    return createConfig(name, get(defaults, 'presets'), get(configurations, `${outputType}.babel.presets`))
  }

  const presets = [
    createPresetConfig('@babel/preset-env'),
    createPresetConfig('@babel/preset-typescript'),
  ]

  const plugins = [
    createPluginConfig('@babel/proposal-class-properties'),
    createPluginConfig('@babel/proposal-object-rest-spread'),
    createPluginConfig('@babel/proposal-export-default-from'),
  ]

  return {
    babelrcRoots: [
      '.',
      'packages/*',
    ],
    ignore: [/node_modules/],
    plugins,
    presets,
  }
} 