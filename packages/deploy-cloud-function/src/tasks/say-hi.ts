import { Task } from '@thrashplay/modular-cli'

export const sayHiTask: Task<{}, {}> = {
  getConfigurationOptions: () => ({}),
  execute: () => {
    console.log('hi!')
    return Promise.resolve({
      result: 'success',
    })
  },
}