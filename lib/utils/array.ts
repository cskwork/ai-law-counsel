/**
 * 배열 정규화 유틸리티
 * XML 파싱 결과에서 단일 값 또는 배열을 일관된 배열로 변환
 */
export function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}
