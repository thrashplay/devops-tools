local droneHost = 'https://drone.thrashplay.com';
// the release channel to promote builds too
local releaseChannel = 'alpha';

local slackConfig() = {
  webhookSecret: 'SLACK_NOTIFICATION_WEBHOOK',
  channel: 'devops',
};

local createBuildSteps(steps) = [
  steps.yarn('install', ['install --frozen-lockfile --non-interactive']),
  steps.yarn('bootstrap'),

  steps.yarn('precheck', ['commitlint --verbose --from HEAD~1 --to HEAD', 'lint']),
  steps.yarn('build'),

  steps.yarn('test'),
];

local pipelineBuilder = function (steps, when, env, utils, templates) [
  {
    name: 'continuous-integration',
    slack: slackConfig(),

    steps:
      utils.join([
        steps.slack(templates.continuousIntegration.buildStarted, 'notify-start'),
        createBuildSteps(steps),

        // publish prereleases from every master build
        steps.release(
        {
          version: {
            amend: true,
            lernaOptions: ['--conventional-prerelease', '--preid', 'next'],
          },
        }) + when(branch = 'master'),

        steps.slack(templates.continuousIntegration.buildCompleted, 'notify-complete') + when(status = ['success', 'failure']),
      ]),

    trigger: {
      event: {
        include: ['push'],
      }
    },
  },
  {
    name: 'publish-tag',
    slack: slackConfig(),

    steps:
      utils.join([
        steps.slack(templates.publishing('next').buildStarted, 'notify-start'),
        steps.yarn('install', ['install --frozen-lockfile --non-interactive']),
        steps.yarn('bootstrap'),
        steps.yarn('build'),

        // publish prereleases from every master build
        steps.release(
        {
          publish: {
            channels: 'next',
            lernaOptions: 'from-package',
            npmTokenSecret: 'NPM_PUBLISH_TOKEN',
          },
        }),

        steps.slack(templates.publishing('next').buildCompleted, 'notify-complete') + when(status = ['success', 'failure']),
      ]),

    trigger: {
      event: {
        include: ['tag'],
      }
    },
  },
  {
    name: 'promote-build',
    slack: slackConfig(),

    // use Drone credentials for publish chores
    git: {
      authorEmail: 'drone@thrashplay.com',
      authorName: 'Drone',
    },

    steps:
      utils.join([
        steps.slack(templates.promotion(releaseChannel).buildStarted, 'notify-start'),
        steps.yarn('install', ['install --frozen-lockfile --non-interactive']),
        steps.yarn('bootstrap'),
        steps.yarn('build'),


        // promote build from any branch, because it's manual
        steps.release({
          npmTokenSecret: 'NPM_PUBLISH_TOKEN',
          version: {
            amend: false,
            lernaOptions: '--conventional-graduate',
          },
          publish: {
            channels: [releaseChannel],
            npmTokenSecret: 'NPM_PUBLISH_TOKEN',
            lernaOptions: 'from-git',
          }
        }),

        steps.slack(templates.promotion(releaseChannel).buildCompleted, 'notify-complete')
          + when(status = ['success', 'failure']),
      ]),

    trigger: {
      event: {
        include: ['custom'],
      }
    }
  },
];

local templates = {
  local buildUrl = '%s/{{repo.owner}}/{{repo.name}}/{{build.number}}' % droneHost,

  continuousIntegration: {
    local commitUrl = '%s/link/{{repo.owner}}/{{repo.name}}/commit/{{build.commit}}' % droneHost,

    buildStarted:
      ':arrow_forward: *<%s|STARTING {{repo.name}} #{{build.number}}>*\n' % buildUrl +
      'Building: <%s|{{truncate build.commit 8}}> on branch _{{build.branch}}_' % commitUrl,
    buildCompleted:
      '{{#success build.status}}\n' +
      '  :+1: *<%s|BUILD SUCCESS: #{{build.number}}>*\n' % buildUrl +
      '  Project: _{{repo.name}}_\n' +
      '  Built: <%s|{{truncate build.commit 8}}> on branch _{{build.branch}}_' % commitUrl +
      '{{else}}\n' +
      '  :octagonal_sign: *<%s|BUILD FAILED: #{{build.number}}>*\n' % buildUrl +
      '  Project: _{{repo.name}}_\n' +
      "  Failed: Building <%s|{{truncate build.commit 8}}> on branch _{{build.branch}}_" % commitUrl +
      '{{/success}}\n' +
      '\n' +
      '```{{build.message}}```',
  },
  publishing(releaseChannel): {
    buildStarted:
      ':arrow_forward: *<%s|STARTING {{repo.name}} #{{build.number}}>*\n' % buildUrl +
      'Publishing: {{build.tag}} to channel _%s_\n' % releaseChannel,
    buildCompleted:
      '{{#success build.status}}\n' +
      '  :+1: *<%s|BUILD SUCCESS: #{{build.number}}>*\n' % buildUrl +
      '  Project: _{{repo.name}}_\n' +
      "  Published: {{build.tag}} to channel _%s_\n" % releaseChannel +
      '{{else}}\n' +
      '  :octagonal_sign: *<%s|BUILD FAILED: #{{build.number}}>*\n' % buildUrl +
      '  Project: _{{repo.name}}_\n' +
      "  Failed: Publishing {{build.tag}} to channel _%s_\n" % releaseChannel +
      '{{/success}}\n'
  },
  promotion(releaseChannel): {
    buildStarted:
      ':arrow_up: *<%s|STARTING {{repo.name}} #{{build.number}}>*\n' % buildUrl +
      'Promoting: branch _{{build.branch}}_ to channel _%s_\n' % releaseChannel,
    buildCompleted:
      '{{#success build.status}}\n' +
      '  :checkered_flag: *<%s|BUILD SUCCESS: #{{build.number}}>*\n' % buildUrl +
      '  Project: _{{repo.name}}_\n' +
      "  Promoted: branch _{{build.branch}}_ to channel _%s_\n" % releaseChannel +
      '{{else}}\n' +
      '  :octagonal_sign: *<%s|BUILD FAILED: #{{build.number}}>*\n' % buildUrl +
      '  Project: _{{repo.name}}_\n' +
      "  Failed: Promoting branch _{{build.branch}}_ to channel _%s_\n" % releaseChannel +
      '{{/success}}\n'
  },
};

local configurePipelines(steps, when, env, utils) = pipelineBuilder(steps, when, env, utils, templates);

// !!! BEGIN AUTO-GENERATED CONFIGURATION !!!
// !!! [TPD/DSL] v0.1.0-alpha.0
// !!! The following content is not meant to be edited by hand
// !!! Changes below this line may be overwritten by generators in thrashplay-app-creators

/**
 * Thrashplay helper library
 */
local __ = {
  castArray(value): if (std.isArray(value)) then value else [value],
  execIf(predicate, action, default): if predicate then action() else default,

  /**
   * Provides 'undefined'-safe lookup of arbitrarily-nested object properties. Takes the following properties:
   *
   * object: the object ccontaining the property to lookup
   * path: a string containing the property path (i.e. "foo.bar.baz"), or an array representing the path (ie. ["foo", "bar", "baz"[
   * default (optional): the value to return if the property does not exist, defaults to null
   */
  get(object, path, default = null):
    local __getRecursive(index, object, path, default) =
      if __.isNull(object) || __.isNull(path)
        then default
        else
          if index >= std.length(path) || !std.objectHas(object, path[index])
            // object doesn't have next path part, or we have gone too far (probably means an empty path array was passed)
            then default
            else if index == std.length(path) - 1
              // we are at the end of the path array, so return the value
              then object[path[index]]
              // the path is still valid, but there is more to traverse
              else __getRecursive(index + 1, object[path[index]], path, default);
    __getRecursive(0, object, if std.isArray(path) then path else std.split(path, '.'), default),

  hasNonEmptyArray(container, propertyName):
    std.objectHas(container, propertyName)
      && std.isArray(container[propertyName])
      && std.length(container[propertyName]) > 0,

  isNull(value): value == null,
  isNullOrEmpty(value): value == null || std.length(value) == 0,

  // This is really useful if you want to make an arry out of
  // constitutent parts which may be lists or optional.
  //
  // Returns the passed array with:
  // 1. Nulls removed
  // 2. Any elements who are arrays flattened into this arry.
  //
  // See: https://github.com/google/jsonnet/issues/234
  //
  join(a):
    local maybeFlatten(acc, i) = if std.type(i) == "array" then acc + i else acc + [i];
    std.foldl(maybeFlatten, __.withoutNulls(a), []),

  notNull(value): value != null,
  nullIfEmpty(array): if std.length(array) == 0 then null else array,

  /**
   * Validates a set of conditions, returning an array of error messages or null.
   *
   * The 'conditions' parameter is an object with arbitrary keys, each is mapped to a boolean value. If any of the
   * booelean values are false, then the key will be used as a returned error message. If every condition is true, then
   * the function returns an empty array.
   */
  assertAll(conditions):
    local evaluate (accumulator, key) = __.join([accumulator, if !conditions[key]() then key]);
    __.withoutNulls(std.foldl(evaluate, std.objectFields(conditions), [])),

  withoutNulls(array): std.filter(__.notNull, array),
};

/**
 * PipelineConfiguration
 *
 * Configures global options for a pipeline. See __defaultPipelineConfiguration
 * for information on it's properties, and what values are used as defaults.
 */

local __defaultPipelineConfiguration = {
  /**
   * Defines environment variables that will be injected into every step.
   */
  environment: {},

  /** write docs */
  git: null,

  /**
   * Name of the pipeline
   */
  name: 'default',

  /**
   * Default Node image tag to use for this pipeline.
   */
  nodeImage: 'node:lts',

  /**
   * (Optional) shared pipeline-wide configuration for Slack messages. Can specify one or both of these properties:
   *
   *  - webhookSecret: the name of the Drone secret containing the Slack webhook URL
   *  - channel: the name of the default channel to post messagse to
   */
  slack: null,

  /**
   * List of step builders
   */
  stepBuilders: [],

  /**
   * Trigger conditions for this pipeline.
   * Must be an object matching the Drone trigger specification. See
   * https://docker-runner.docs.drone.io/configuration/trigger/ for more
   * information.
   */
  trigger: {}
};

/**
 * Builders
 *
 * A builder is a function that takes arbitrary parameters, and returns an
 * object that must have 'build' function. The build function must take a
 * 'PipelineConfiguration' object, and return a single Step object, an array
 * of Step objects, or null.
 *
 * Step objects should match the Step configuration requirements for the version
 * of Drone in use. See https://docker-runner.docs.drone.io/configuration/steps/
 * for available options.
 *
 * In addition to to the required 'build' function, a Step may optionally define
 * a 'validate' function. This method is used to validate the step's
 * configuration, and generate messages describing invalid options. The validate
 * function must return an array of strings. If any step has errors, then the
 * pipeline will abort, logging the messages generated by Steps.
 */

/**
 * Creates a custom, named step from an arbitrary Step configuration.
 * See https://docker-runner.docs.drone.io/configuration/steps/ for information
 * on valid configuration options.
 */
local __customStepBuilder(name = null, image = null, commands = [], extraConfig = {}) = {
  validate: function (pipelineConfig)
    __.assertAll({
      'Custom step definition is missing a [name] property.'(): name != null && std.length(name) > 0,
      ['Step [' + name + '] is missing a container image.'](): image != null && std.length(image) > 0,
      ['Step [' + name + '] does not have any commands.'](): !__.isNullOrEmpty(commands),
    }),

  build: function (pipelineConfig) [
    extraConfig + {
      name: name,
      image: image,
      commands: __.castArray(commands)
    }
  ],
};

/**
 * Creates a custom, named plugin from an arbitrary Plugin configuration.
 * See https://docker-runner.docs.drone.io/configuration/plugins/ for information
 * on valid configuration options.
 */
local __pluginBuilder(name = null, image = null, settings = {}, extraConfig = {}) = {
  validate: function (pipelineConfig)
    __.assertAll({
      'Plugin definition is missing a [name] property.'(): name != null && std.length(name) > 0,
      ['Plugin [' + name + '] is missing a container image.'](): image != null && std.length(image) > 0,
    }),

  build: function (pipelineConfig) [
    extraConfig + {
      name: name,
      image: image,
      settings: settings,
    }
  ],
};

/**
 * Creates a step that executes one or more Yarn commands. If no commands are specified, then the name of the step
 * will be uased the Yarn command to run. The specified configuration object will be used to default any Step options
 * that the Yarn configuration does not specifically override (name, image, and commands).
 */
local __yarnStepBuilder(name, commands = [name], config = {}) = {
  local yarnStepBuilder = self,
  createCommand(script):: std.join(' ', ['yarn', script]),

  validate: function (pipelineConfig)
    __.assertAll({
      ['Yarn step definition is missing a [name] property.'](): name != null && std.length(name) > 0,
      ['Yarn step [' + name + '] does not have any commands specified.'](): std.length(commands) > 0,
    }),

  build: function (pipelineConfig) [
    config + {
      name: name,
      image: pipelineConfig.nodeImage,
      commands:
        [': *** yarn -- running commands: [' + std.join(', ', __.castArray(commands)) + ']'] +
        std.map(yarnStepBuilder.createCommand, __.castArray(commands)),
    }
  ],
};

/**
 * Configures a plugin that will configure npm for future publish operations. Takes one parameter, which is the name
 * of the Drone secret containing the NPM token for authorization.
 */
local __npmAuthStepBuilder(npmTokenSecret = null) = {
  validate: function (pipelineConfig)
    __.assertAll({
      'npmTokenSecret is required if any publish commands are specified.'(): !__.isNullOrEmpty(npmTokenSecret)
    }),

  build: function (pipelineConfig)
    __pluginBuilder(
      'npm-auth',
      'robertstettner/drone-npm-auth',
      { token: { from_secret: npmTokenSecret } }
    ).build(pipelineConfig)
};

/**
 * Builds a step that will send a message to Slack. The channel and webhookSecret parameters are required, unless they
 * have been specified in the 'slack' property of the PipelineConfiguration.
 */
local __slackStepBuilder(message = null, stepName = 'slack', channelOverride = null, webhookSecretOverride = null) = {
  local webhook(pipelineConfig) =
    if !__.isNullOrEmpty(webhookSecretOverride) then webhookSecretOverride else __.get(pipelineConfig, 'slack.webhookSecret'),
  local channel(pipelineConfig) =
    if !__.isNullOrEmpty(channelOverride) then channelOverride else __.get(pipelineConfig, 'slack.channel'),

  validate: function (pipelineConfig)
    __.assertAll({
      'Slack step definition is missing a [stepName] property.'(): stepName != null && std.length(stepName) > 0,
      ['Slack step configuration [' + stepName + '] does not have a message.'](): !__.isNullOrEmpty(message),
      'webhookSecret is required, either in the pipeline slack configuration or as a parameter.'():
        !__.isNullOrEmpty(webhook(pipelineConfig)),
      'channel is required, either in the pipeline slack configuration or as a parameter.'():
        !__.isNullOrEmpty(channel(pipelineConfig)),
    }),

  build: function (pipelineConfig)
    __pluginBuilder(
      stepName,
      'plugins/slack',
      {
        channel: channel(pipelineConfig),
        template: message,
        webhook: {
          from_secret: webhook(pipelineConfig),
        },
      }
    ).build(pipelineConfig)
};

/**
 * Builds the steps needed to perform release (i.e. version and publish) tasks. Takes a configuration object, with the
 * the following values:
 *
 * - npmTokenSecret: the name of the Drone secret with the NPM publish token; required if 'publish' is specified
 * - publish: the list of Yarn commands to run when publishing
 * - version: the list of Yarn commands to run when versioning
 */
local __releaseStepBuilder(releaseConfig = {}) = {
  local amendCommits = __.get(releaseConfig, 'version.amend', false),
  local hasVersionConfig() = !__.isNullOrEmpty(__.get(releaseConfig, 'version')),
  local hasPublishConfig() = !__.isNullOrEmpty(__.get(releaseConfig, 'publish')),
  local lernaVersionOptions = __.join([__.get(releaseConfig, 'version.lernaOptions')]),
  local lernaPublishOptions = __.join([__.get(releaseConfig, 'publish.lernaOptions')]),
  local npmTokenSecret = __.get(releaseConfig, 'publish.npmTokenSecret'),
  local releaseChannels = __.castArray(__.get(releaseConfig, 'publish.channels', 'latest')),

  validate: function (pipelineConfig)
    local hasVersionOrPublishConfig() = hasVersionConfig() || hasPublishConfig();
    __.assertAll({
      'Release step must specify at least one of [version] or [publish].'(): hasVersionOrPublishConfig(),
      'npmTokenSecret is required if any publish commands are specified.'(): !hasPublishConfig() || !__.isNullOrEmpty(npmTokenSecret),
      'A publish configuration cannot specify any empty [channels] property.'(): !hasPublishConfig() || !__.isNullOrEmpty(releaseChannels),
    }),

  build: function (pipelineConfig)
    local createYarnStep(stepName, command) =
      __yarnStepBuilder(std.join('-', ['release', stepName]), command).build(pipelineConfig);
    local createCustomStep(stepName, image, command) =
      __customStepBuilder(std.join('-', ['release', stepName]), image, command).build(pipelineConfig);

    local buildPublishSteps() =
      local createTagCommand(referenceTag) = function(tagToAdd)
        'sh .ci/tag-npm-packages.sh %s %s' % [referenceTag, tagToAdd];

      if std.objectHas(releaseConfig, 'publish') then createCustomStep('publish', pipelineConfig.nodeImage,
        __.join([
          // publish command to first channel
          'yarn lerna publish ' + std.join(' ', __.join([
            lernaPublishOptions,
            '--yes',
            '--no-git-reset',
            '--dist-tag',
            releaseChannels[0],
          ])),

          // if there are other channels, add them with npm
          if std.length(releaseChannels) > 1 then 'echo "Adding additional distribution tags..."',
          std.map(createTagCommand(releaseChannels[0]), releaseChannels[1:]),
        ]));

    local buildVersionSteps() =
      if !std.objectHas(releaseConfig, 'version') then null
        else
          if amendCommits then
            createCustomStep('version', pipelineConfig.nodeImage, [
              'sh .ci/amend-commit.sh',
              'yarn lerna version ' + std.join(' ', __.join([
                lernaVersionOptions,
                '--amend',
                '--no-changelog',
                '--no-push',
                '--yes',
              ])),
              'sh .ci/push-tags.sh',
            ])
          else
            createCustomStep('version', pipelineConfig.nodeImage, [
              'yarn lerna version ' + std.join(' ', __.join([lernaVersionOptions, '--yes'])),
            ]);

    __.join([
      if (hasPublishConfig()) then __npmAuthStepBuilder(npmTokenSecret).build(pipelineConfig),
      __customStepBuilder('fetch-tags', 'drone/git', 'git fetch --tags').build(pipelineConfig),
      buildVersionSteps(),
      buildPublishSteps()
    ]),
};

/**
 * Builds a step that initializes the Git author name and email. If the PipelineConfiguration has a 'git' property,
 * it's values will be used. Otherwise, the identity of the last committer (the one triggering this build) wil be used.
 */
local __initGitStepBuilder() = {
  build: function (pipelineConfig) {
    local authorEmail = __.get(pipelineConfig, 'git.authorEmail', '`git log -1 --pretty=format:"%ae"`'),
    local authorName = __.get(pipelineConfig, 'git.authorName', '`git log -1 --pretty=format:"%an"`'),

    name: 'init-git',
    image: 'alpine/git',
    commands: [
      ': *** Initializing git user information...',
      'git config --local user.email ' + authorEmail,
      'git config --local user.name ' + authorName,
    ]
  },
};

local __pipelineFactory() = {
  local pipelineFactory = self,

  /**
   * Called when one or more steps have invalid configuration, and is supplied
   * with the validation messages. Should generate a pipeline that terminates
   * without building, but informs the user what was wrong.
   */
  createErrorSteps(pipelineConfig, errors)::
    __customStepBuilder('log-configuration-errors', {
      image: 'alpine',
      commands: __.join([
        ': *** There were errors in the build pipeline configuration:',
        ': ',
        std.map((function(message) ': ' + std.escapeStringBash(message)), errors),
        'exit 1'
      ])
    }).build(pipelineConfig),

  /**
   * Get errors if the builders themselves are invalid, and don't conform to the proper interface.
   */
  getStepBuilderStructuralErrors(pipelineConfig, stepBuilders)::
    local conditions(stepBuilder) = {
      'Builder is missing a [build] method.'(): std.objectHas(stepBuilder, 'build')
    };
    local getValidationErrors (errors, stepBuilder) = __.join([errors, __.assertAll(conditions(stepBuilder))]);
    std.foldl(getValidationErrors, stepBuilders, []),

  /**
   * Get validation errors from the builders themselves.
   */
  getStepBuilderValidationErrors(pipelineConfig, stepBuilders)::
    local validateStep = function (errors, stepBuilder)
      __.join([errors, __.get(stepBuilder, 'validate', (function (pipelineConfig) []))(pipelineConfig)]);
    std.foldl(validateStep, stepBuilders, []),

  /**
   * Given an array of zero or more builders, attempts to create an array of corresponding steps.
   *
   * This methods returns an object with two properties:
   *   - errors: If the configuration is invalid, this will be an array of messages describing the errors. Otherwise, null.
   *   - steps: If the configuration is valid, this is a flattened array of 'step' objects. Otherwise, it will be null.
   */
  createStepsFromBuilders(pipelineConfig, stepBuilders):: {
    local decorate(decorator, value) = if (std.isArray(value)) then std.map(decorator, value) else decorator(value),
    local environment = { environment: pipelineConfig.environment },
    local getExtraOptions(stepBuilder) = __.get(stepBuilder, 'extraOptions', {}),
    local addOptionsToStep(stepBuilder) = function (step)
      step +
        { environment: (__.get(step, 'environment', {}) + __.get(stepBuilder, 'extraEnvironment', {})) } +
        { when: (__.get(step, 'when', {}) + __.get(stepBuilder, 'when', {})) },
    local withExtraOptions(stepBuilder, steps) = decorate(addOptionsToStep(stepBuilder), steps),
    local withEnvironment(steps) = decorate((function (step) environment + step), steps),
    local buildStep(stepBuilder) = withExtraOptions(stepBuilder, withEnvironment(stepBuilder.build(pipelineConfig))),

    local errorMessages =
      __.nullIfEmpty(
        __.join([
          pipelineFactory.getStepBuilderStructuralErrors(pipelineConfig, stepBuilders),
          pipelineFactory.getStepBuilderValidationErrors(pipelineConfig, stepBuilders)
        ])),

    local addSteps(accumulator, stepBuilder) = __.join([accumulator, buildStep(stepBuilder)]),
    errors: errorMessages,
    steps: if errorMessages == null then std.foldl(addSteps, stepBuilders, []),
  },

  /**
   * Performs the actual work of converting a PipelineConfiguration into a Pipeline object, in the format required by
   * Drone.
   */
  createPipeline(prePipelineStepBuilders, postPipelineStepBuilders): function (configuration = {}) {
    local config = __defaultPipelineConfiguration + configuration,
    local errors = __.assertAll({
      ["Pipeline [" + config.name + "] did not have any steps."](): __.hasNonEmptyArray(config, 'steps'),
    }),

    local allStepBuilders = prePipelineStepBuilders + config.steps + postPipelineStepBuilders,
    local builderResult = pipelineFactory.createStepsFromBuilders(config, allStepBuilders),

    kind: 'pipeline',
    name: config.name,

    steps:
      if builderResult.errors != null then
        pipelineFactory.createErrorSteps(config, builderResult.errors)
      else
        builderResult.steps,

    trigger: config.trigger,
  },
};

local __defaultPrePipelineStepBuilders = [__initGitStepBuilder()];
local __defaultPostPipelineStepBuilders = [];

local __optionsFactory = {
  when(branch = null, cron = null, event = null, instance = null, ref = null, repo = null, trigger = null, status = null, target = null): {
    local wrapString(value) = if (std.isString(value)) then __.castArray(value) else value,

    when: {
      [if branch != null then 'branch']: wrapString(branch),
      [if cron != null then 'cron']: wrapString(cron),
      [if event != null then 'event']: wrapString(event),
      [if instance != null then 'instance']: wrapString(instance),
      [if ref != null then 'ref']: wrapString(ref),
      [if repo != null then 'repo']: wrapString(repo),
      [if trigger != null then 'trigger']: wrapString(trigger),
      [if status != null then 'status']: wrapString(status),
      [if target != null then 'target']: wrapString(target),
    }
  },

  environment(environment): {
    extraEnvironment: environment
  },
};

local __stepBuilderFactory = {
  custom: __customStepBuilder,
  plugin: __pluginBuilder,
  release: __releaseStepBuilder,
  slack: __slackStepBuilder,
  yarn: __yarnStepBuilder,
};

std.map(
  __pipelineFactory().createPipeline(__defaultPrePipelineStepBuilders, __defaultPostPipelineStepBuilders),
  configurePipelines(__stepBuilderFactory, __optionsFactory.when, __optionsFactory.env, __ ))

