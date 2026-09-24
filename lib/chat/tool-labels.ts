// 도구 이름 → 사용자 표시 라벨 / 안내선(출처 유형) 매핑

/** 안내선 색: 법령(파랑) · 판례(초록) · 행정규칙(노랑) · 기타(중립) */
export type WayLine = 'law' | 'precedent' | 'admin' | 'neutral';

const TOOL_LABELS: Record<string, string> = {
  search_law: '법령 검색',
  get_law_detail: '법령 조문 조회',
  search_precedent: '판례 검색',
  get_precedent_detail: '판례 상세 조회',
  search_administrative_rule: '행정규칙 검색',
  clarify_situation: '추가 질문 준비',
};

/** 도구 표시 라벨 (미등록 도구는 원래 이름) */
export function toolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] ?? toolName;
}

/** 도구가 다루는 출처 유형 (이름 규칙 기반, MCP 동적 도구 포함) */
export function toolWayLine(toolName: string): WayLine {
  if (toolName.includes('precedent')) return 'precedent';
  if (toolName.includes('admin')) return 'admin';
  if (toolName.includes('law') || toolName.includes('article') || toolName.includes('statute')) return 'law';
  return 'neutral';
}
