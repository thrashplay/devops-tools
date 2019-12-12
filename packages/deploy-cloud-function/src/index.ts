import { execute } from '@thrashplay/modular-cli'

import { commands } from './commands'

;(async () => {
  try {
    execute(commands, { scriptName: 'deploy-cloud-function' })
  } catch (e) {
    console.error('Failed to execute command:', e)
  }
})()