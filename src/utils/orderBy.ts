// src/common/utils/orderBy.ts
import { getColumnMapping } from './columnMapper'

export function buildOrderBy<T extends new () => any>(dtoClass: T, sort?: string): string {
  if (!sort?.trim()) return ''

  try {
    const columnMapping = getColumnMapping(dtoClass)

    if (!(columnMapping instanceof Map)) {
      throw new Error('Invalid column mapping')
    }
    const clauses = sort.split(',').map((pair) => {
      const [field, order] = pair.split(':').map((s) => s.trim())
      if (!field) throw new Error('Invalid sort field')

      const mappedField = columnMapping.get(field) || field
      const dir = order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'
      return `${mappedField} ${dir}`
    })

    return clauses.length > 0 ? `ORDER BY ${clauses.join(', ')}` : ''
  } catch (error) {
    console.error('Error building ORDER BY clause:', error)
    return ''
  }
}
