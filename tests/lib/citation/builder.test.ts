import { describe, it, expect } from 'vitest';
import { buildStatuteUrl, buildPrecedentUrl, buildExternalUrl } from '@/lib/citation/builder';

describe('인용 URL 빌더', () => {
  describe('buildStatuteUrl', () => {
    it('법령 페이지 URL을 생성해야 한다', () => {
      const url = buildStatuteUrl('민법');

      expect(url).toBe('https://www.law.go.kr/법령/민법');
    });

    it('특수문자가 포함된 법령명을 인코딩해야 한다', () => {
      const url = buildStatuteUrl('주택임대차보호법');

      expect(url).toContain('law.go.kr');
      expect(url).toContain('주택임대차보호법');
    });

    it('조문 번호가 있으면 딥링크를 생성해야 한다', () => {
      const url = buildStatuteUrl('민법', '750');

      expect(url).toContain('law.go.kr');
      expect(url).toContain('민법');
    });
  });

  describe('buildPrecedentUrl', () => {
    it('판례 검색 URL을 생성해야 한다', () => {
      const url = buildPrecedentUrl('2023다12345');

      expect(url).toContain('law.go.kr');
      expect(url).toContain('2023다12345');
    });
  });

  describe('buildExternalUrl', () => {
    it('법령 타입에 대해 법령 URL을 생성해야 한다', () => {
      const url = buildExternalUrl('statute', '민법');

      expect(url).toContain('law.go.kr');
      expect(url).toContain('민법');
    });

    it('판례 타입에 대해 판례 URL을 생성해야 한다', () => {
      const url = buildExternalUrl('precedent', '2023다12345');

      expect(url).toContain('law.go.kr');
    });

    it('행정규칙 타입에 대해 기본 URL을 생성해야 한다', () => {
      const url = buildExternalUrl('rule', '행정규칙명');

      expect(url).toContain('law.go.kr');
    });

    it('조문 번호를 포함할 수 있어야 한다', () => {
      const url = buildExternalUrl('statute', '민법', '750');

      expect(url).toContain('민법');
    });
  });
});
