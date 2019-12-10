const path = require('path')
const fs = require('fs')

const { get, merge } = require('lodash')
const webpack = require('webpack')
const webpackMerge = require('webpack-merge')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin')

const ALLOWED_OUTPUT_TYPES = [
  'application',
  'library',
  'script',
]

const basePath = process.cwd()
const sourcePath = path.resolve(basePath, 'src')
const outputPath = path.resolve(basePath, 'dist')

const defaultConfiguration = {
  filename: '[name].bundle.js',
  plugins: [new ForkTsCheckerWebpackPlugin()],
  transpileOnly: true,
}
const configurations = {
  library: {
    transpileOnly: false,
  },
  script: {
    filename: 'cli.js',
    plugins: [
      new ForkTsCheckerWebpackPlugin(),
      new webpack.BannerPlugin({ banner: '#!/usr/bin/env node', raw: true }),
    ],
  },
}

const getOutputTypeConfiguration = (type) => {
  return merge({}, defaultConfiguration, get(configurations, type, {}))
}

const readJsonFile = (file) => {
  return JSON.parse(fs.readFileSync(file))
}

const environments = {
  dev: () => {
    return {
      devtool: 'inline-source-map',
      mode: 'development',
      optimization: {
        minimize: false,
      },
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

const common = (outputType) => {
  config = getOutputTypeConfiguration(outputType)

  const babelLoader = {
    loader: 'babel-loader',
    options: {
      envName: outputType,
      rootMode: 'upward',
    },
  }

  return {
    entry: path.resolve(sourcePath, 'index.ts'),
    module: {
      rules: [{
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          babelLoader,
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: config.transpileOnly,
            },
          },
        ],
      }, {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [ babelLoader ],
      }],
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
    target: 'node',
  }
}

module.exports = (env) => {
  const environmentName = get(env, 'name', 'prod')

  const packageJson = readJsonFile(path.resolve(basePath, 'package.json'))
  const outputType = get(packageJson, 'thrashplayWebpack.outputType', undefined)
  if (!ALLOWED_OUTPUT_TYPES.includes(outputType)) {
    throw new Error(`Invalid output type: ${outputType}`)
  }

  console.log('Using webpack env:', JSON.stringify({
    environmentName,
    outputType,
  }, null, '  '))

  return webpackMerge.smart(
    common(outputType), 
    environments[environmentName](),
  )
}