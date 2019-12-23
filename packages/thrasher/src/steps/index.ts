import { create as createCreateTsConfigs } from './create-tsconfigs'
import { create as createDump } from './dump'
import { create as createFindRoot } from './find-root'
import { BuildStep } from './build-step'
export * from './build-step'

export interface StepFactory {
  createDump: () => BuildStep
  createCreateTsConfigs: () => BuildStep
}

export const Steps: StepFactory = {
  createDump,
  createCreateTsConfigs,
}