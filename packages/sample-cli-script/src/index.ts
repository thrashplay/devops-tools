import { getValue } from '@thrashplay/sample-library'

export const processString = (value: string) => {
  return `${value}`
}

export const getFinalValue = (args: string[]) => {
  return `Hello there, ${processString(getValue())}. I'm ${args}.`
}

const [,, ...args] = process.argv
console.log(getFinalValue(args))