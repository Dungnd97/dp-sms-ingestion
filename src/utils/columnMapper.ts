import { defaultMetadataStorage } from 'class-transformer/cjs/storage'
import type { ClassConstructor } from 'class-transformer'

export function getColumnMapping<T>(dtoClass: ClassConstructor<T>): Map<string, string> {
  const map = new Map<string, string>()

  // Lấy metadata từ class-transformer
  defaultMetadataStorage.getExposedMetadatas(dtoClass).forEach((meta) => {
    if (meta.options?.name) {
      // Ánh xạ property name thành db column name
      map.set(meta.propertyName, meta.options.name)
    }
  })

  return map
}
