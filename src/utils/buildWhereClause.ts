import { getColumnMapping } from './columnMapper';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

type FilterOperator = '=' | 'LIKE' | '>' | '<' | '>=' | '<=' | 'IN';
type FilterValue = string | number | boolean | Date | Array<string | number>;

interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: FilterValue;
}

export function buildWhereClause<T extends object>(
  dtoClass: new () => T,
  filters?: Record<string, FilterValue | { operator: FilterOperator; value: FilterValue }>
): { clause: string; params: Record<string, any> } {
  if (!filters || Object.keys(filters).length === 0) {
    return { clause: '', params: {} };
  }

  const columnMapping = getColumnMapping(dtoClass);
  const conditions: string[] = [];
  const params: Record<string, any> = {};
  let paramIndex = 0;

  Object.entries(filters).forEach(([field, filter]) => {
    const dbColumn = columnMapping.get(field) || field;
    const { operator, value } = normalizeFilter(filter);

    if (Array.isArray(value)) {
      // Xử lý trường hợp mảng (IN clause)
      const paramKeys = value.map((_, i) => {
        const paramKey = `param_${field}_${paramIndex++}`;
        params[paramKey] = value[i];
        return `:${paramKey}`;
      });
      conditions.push(`${dbColumn} IN (${paramKeys.join(', ')})`);
    } else {
      // Xử lý các trường hợp thông thường
      const paramKey = `param_${field}_${paramIndex++}`;
      params[paramKey] = operator === 'LIKE' 
    ? `%${String(value)}%` 
    : value;
      
      switch (operator) {
        case 'LIKE':
          conditions.push(`${dbColumn} LIKE :${paramKey}`);
          break;
        case 'IN':
          conditions.push(`${dbColumn} = ANY(:${paramKey})`);
          break;
        default:
          conditions.push(`${dbColumn} ${operator} :${paramKey}`);
      }
    }
  });

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}

function normalizeFilter(
  filter: FilterValue | { operator: FilterOperator; value: FilterValue }
): { operator: FilterOperator; value: FilterValue } {
  if (typeof filter === 'object' && !Array.isArray(filter) && 'operator' in filter) {
    return filter as { operator: FilterOperator; value: FilterValue };
  }
  return { operator: '=', value: filter as FilterValue };
}