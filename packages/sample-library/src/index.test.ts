import { getValue } from '.'

test('value is World', () => {
  expect(getValue()).toBe('World')
})