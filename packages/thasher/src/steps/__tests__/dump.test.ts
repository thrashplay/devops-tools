import { create } from '../dump'
import { Project } from '../../model'

describe('detect-project-structure task', () => {
  const configuration = { initialDirectory: '/base-dir' }
  const project = new Project('/base-dir', true, '/base-dir', [])

  it('returns same project that was passed in', () => {
    create().execute(configuration, project)
      .then((result) => {
        expect(result).toBe(project)
      })
  })
})