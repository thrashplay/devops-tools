import { getFinalValue } from '.'

test('adds 2 + 3 to equal 5', () => {
  expect(2 + 3).toBe(5)
})

test('final value', () => {
  expect(getFinalValue(['Someone'])).toBe('Hello there, World. I\'m Someone.')
})