import { describe, expect, it } from 'vitest';
import { toolLabel, toolWayLine } from '@/lib/chat/tool-labels';

describe('tool-labels', () => {
  it('등록된 도구는 한국어 라벨, 미등록 도구는 원래 이름을 반환한다', () => {
    expect(toolLabel('search_law')).toBe('법령 검색');
    expect(toolLabel('unknown_tool')).toBe('unknown_tool');
  });

  it('도구 이름으로 출처 안내선을 고른다', () => {
    expect(toolWayLine('search_law')).toBe('law');
    expect(toolWayLine('get_law_detail')).toBe('law');
    expect(toolWayLine('search_precedent')).toBe('precedent');
    expect(toolWayLine('search_administrative_rule')).toBe('admin');
    expect(toolWayLine('clarify_situation')).toBe('neutral');
  });
});
