import { describe, it, expect } from 'vitest';
import { buildStatuteUrl, buildPrecedentUrl, buildExternalUrl } from '@/lib/citation/builder';

describe('인용 URL 빌더', () => {
  describe('buildStatuteUrl', () => {
    it('법령 페이지 URL을 생성해야 한다', () => {
      const url = buildStatuteUrl('민법');

      expect(url).toBe(`https://www.law.go.kr/법령/${encodeURIComponent('민법')}`);
    });

    it('특수문자가 포함된 법령명을 인코딩해야 한다', () => {
      const url = buildStatuteUrl('주택임대차보호법');

      expect(url).toBe(`https://www.law.go.kr/법령/${encodeURIComponent('주택임대차보호법')}`);
    });

    it('조문 번호가 있으면 한글주소 형식 딥링크를 생성해야 한다', () => {
      const url = buildStatuteUrl('민법', '750');

      expect(url).toBe(`https://www.law.go.kr/법령/${encodeURIComponent('민법')}/${encodeURIComponent('제750조')}`);
    });

    it('하이픈 포함 조문번호를 처리해야 한다', () => {
      const url = buildStatuteUrl('민법', '3-2');

      expect(url).toBe(`https://www.law.go.kr/법령/${encodeURIComponent('민법')}/${encodeURIComponent('제3조의2')}`);
    });

    it('제/조가 포함된 입력도 정규화해야 한다', () => {
      const url = buildStatuteUrl('민법', '제8조');

      expect(url).toBe(`https://www.law.go.kr/법령/${encodeURIComponent('민법')}/${encodeURIComponent('제8조')}`);
    });
  });

  describe('buildPrecedentUrl', () => {
    it('판례 검색 URL을 생성해야 한다', () => {
      const url = buildPrecedentUrl('2023다12345');

      expect(url).toBe(`https://www.law.go.kr/precSc.do?query=${encodeURIComponent('2023다12345')}`);
    });

    it('영문 사건번호도 인코딩해야 한다', () => {
      const url = buildPrecedentUrl('2020헌바123');

      expect(url).toBe(`https://www.law.go.kr/precSc.do?query=${encodeURIComponent('2020헌바123')}`);
    });
  });

  describe('buildExternalUrl', () => {
    it('법령 타입에 대해 법령 URL을 생성해야 한다', () => {
      const url = buildExternalUrl('statute', '민법');

      expect(url).toBe(`https://www.law.go.kr/법령/${encodeURIComponent('민법')}`);
    });

    it('법령 타입에 조문번호를 포함할 수 있어야 한다', () => {
      const url = buildExternalUrl('statute', '민법', '750');

      expect(url).toBe(`https://www.law.go.kr/법령/${encodeURIComponent('민법')}/${encodeURIComponent('제750조')}`);
    });

    it('판례 타입에 대해 검색 URL을 생성해야 한다', () => {
      const url = buildExternalUrl('precedent', '2023다12345');

      expect(url).toBe(`https://www.law.go.kr/precSc.do?query=${encodeURIComponent('2023다12345')}`);
    });

    it('행정규칙 타입에 대해 행정규칙 URL을 생성해야 한다', () => {
      const url = buildExternalUrl('rule', '행정규칙명');

      expect(url).toBe(`https://www.law.go.kr/행정규칙/${encodeURIComponent('행정규칙명')}`);
    });
  });
});
