const path = require('path')

const { concat, get, merge } = require('lodash')
const webpack = require('webpack')
const webpackMerge = require('webpack-merge')
const nodeExternals = require('webpack-node-externals')
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin')
const CircularDependencyPlugin = require('circular-dependency-plugin')

const { getOutputType } = require('./build-lib/index')

const ALLOWED_OUTPUT_TYPES = [
  'application',
  'node-library',
  'script',
]

const basePath = process.cwd()
const sourcePath = path.resolve(basePath, 'src')
const outputPath = path.resolve(basePath, 'dist')

const defaultConfiguration = {
  filename: '[name].bundle.js',
  plugins: [
    new CircularDependencyPlugin({
      // exclude detection of files based on a RegExp
      exclude: /node_modules/,
      // include specific files based on a RegExp
      // include: /dir/,
      // add errors to webpack instead of warnings
      failOnError: true,
      // allow import cycles that include an asyncronous import,
      // e.g. via import(/* webpackMode: "weak" */ './file.js')
      allowAsyncCycles: false,
      // set the current working directory for displaying module paths
      cwd: basePath,
    }),
  ],
}
const configurations = {
  script: {
    filename: 'cli.js',
    plugins: concat(defaultConfiguration.plugins, [
      new webpack.BannerPlugin({ banner: '#!/usr/bin/env node', raw: true }),
    ]),
  },
}

const getOutputTypeConfiguration = (type) => {
  return merge({}, defaultConfiguration, get(configurations, type, {}))
}

const environments = {
  dev: () => {
    return {
      devtool: 'inline-source-map',
      mode: 'development',
      optimization: {
        minimize: false,
      },
      // stats: 'errors-only',
      target: 'node',
    }
  },
  prod: () => {
    return {
      devtool: 'source-map',
      mode: 'production',
      optimization: {
        minimize: true,
      },
    }
  },
}

const common = (env) => {
  const outputType = env.outputType
  const config = getOutputTypeConfiguration(outputType)

  return {
    entry: path.resolve(sourcePath, 'index.ts'),
    externals: [
      nodeExternals(),
      nodeExternals({ modulesDir: path.resolve(basePath, '../../node_modules') }),
    ],
    module: {
      rules: [
        {
          test: /\.(j|t)sx?$/,
          exclude: /node_modules/,
          use: [{
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
              rootMode: 'upward',
            },
          }],
        },
      ],
    },
    output: {
      path: outputPath,
      filename: config.filename,
      libraryTarget: 'commonjs2',
    },
    plugins: config.plugins,
    resolve: {
      extensions: ['.ts', '.js', '.json'],
      plugins: [new TsconfigPathsPlugin()],
    },
    stats: {
      // Ignore warnings due to yarg's dynamic module loading
      warningsFilter: [/node_modules\/yargs/],
    },
    target: 'node',
  }
}

module.exports = (env) => {
  const environmentName = get(env, 'name', 'prod')

  const outputType = getOutputType()
  if (!ALLOWED_OUTPUT_TYPES.includes(outputType)) {
    throw new Error(`Invalid output type: ${outputType}`)
  }

  const augmentedEnv = {
    ...env,
    environmentName,
    outputType,
  }

  return webpackMerge.smart(
    common(augmentedEnv), 
    environments[environmentName](augmentedEnv),
  )
}