/**
 * sanitizeContent 단위 테스트
 * LLM 응답의 HTML 태그 -> Markdown 변환 검증
 */
import { describe, it, expect } from 'vitest';
import { sanitizeContent } from '@/lib/utils/sanitize-content';

describe('sanitizeContent', () => {
  describe('<br> 태그 변환', () => {
    it('<br> 변형들을 줄바꿈으로 변환한다', () => {
      expect(sanitizeContent('line1<br>line2<br/>line3<br />line4'))
        .toBe('line1\nline2\nline3\nline4');
    });

    it('대소문자를 구분하지 않는다', () => {
      expect(sanitizeContent('text<BR>more<Br/>end'))
        .toBe('text\nmore\nend');
    });

    it('속성이 포함된 br 태그를 처리한다', () => {
      expect(sanitizeContent('a<br style="clear:both">b'))
        .toBe('a\nb');
    });
  });

  describe('볼드/이탤릭 태그 변환', () => {
    it('<b> 태그를 ** 로 변환한다', () => {
      expect(sanitizeContent('이것은 <b>중요한</b> 내용입니다'))
        .toBe('이것은 **중요한** 내용입니다');
    });

    it('<strong> 태그를 ** 로 변환한다', () => {
      expect(sanitizeContent('<strong>핵심</strong> 사항'))
        .toBe('**핵심** 사항');
    });

    it('<i>/<em> 태그를 * 로 변환한다', () => {
      expect(sanitizeContent('<i>참고</i> 사항 <em>중요</em>'))
        .toBe('*참고* 사항 *중요*');
    });

    it('non-greedy 매칭으로 개별 태그를 처리한다', () => {
      expect(sanitizeContent('<b>a</b> and <b>b</b>'))
        .toBe('**a** and **b**');
    });
  });

  describe('<p> 태그 변환', () => {
    it('인접 단락 경계를 이중 줄바꿈으로 변환한다', () => {
      const result = sanitizeContent('<p>단락1</p><p>단락2</p>');
      expect(result).toContain('단락1');
      expect(result).toContain('단락2');
      expect(result).not.toContain('<p>');
      expect(result).not.toContain('</p>');
    });
  });

  describe('<hr> 태그 변환', () => {
    it('<hr> 태그를 --- 로 변환한다', () => {
      expect(sanitizeContent('위<hr>아래')).toBe('위\n---\n아래');
    });

    it('속성이 포함된 hr 태그를 처리한다', () => {
      expect(sanitizeContent('위<hr class="divider"/>아래')).toBe('위\n---\n아래');
    });
  });

  describe('제목 태그 변환', () => {
    it('<h2> 태그를 ## 으로 변환한다', () => {
      expect(sanitizeContent('<h2>제목</h2>본문')).toBe('## 제목\n본문');
    });

    it('여러 수준의 제목을 처리한다', () => {
      expect(sanitizeContent('<h1>대제목</h1>')).toBe('# 대제목');
      expect(sanitizeContent('<h3>소제목</h3>')).toBe('### 소제목');
    });
  });

  describe('<u> 밑줄 태그 제거', () => {
    it('<u> 태그를 제거하고 텍스트를 보존한다', () => {
      expect(sanitizeContent('<u>밑줄 텍스트</u>')).toBe('밑줄 텍스트');
    });
  });

  describe('혼합 콘텐츠', () => {
    it('법률 DB 실제 패턴을 처리한다', () => {
      const input = '<b>민법</b> 제750조<br>불법행위의 내용<br/>제751조';
      const expected = '**민법** 제750조\n불법행위의 내용\n제751조';
      expect(sanitizeContent(input)).toBe(expected);
    });

    it('사용자 보고 패턴을 처리한다', () => {
      const input = '1. 내용증명 발송<br>2. 임차권등기명령 신청<br>3. 이사 및 전입신고';
      const expected = '1. 내용증명 발송\n2. 임차권등기명령 신청\n3. 이사 및 전입신고';
      expect(sanitizeContent(input)).toBe(expected);
    });
  });

  describe('엣지 케이스', () => {
    it('일반 마크다운은 그대로 통과한다', () => {
      const input = '일반 마크다운 **텍스트**\n- 항목1\n- 항목2';
      expect(sanitizeContent(input)).toBe(input);
    });

    it('빈 문자열을 처리한다', () => {
      expect(sanitizeContent('')).toBe('');
    });

    it('과도한 줄바꿈을 정리한다', () => {
      expect(sanitizeContent('a<br><br><br><br>b')).toBe('a\n\nb');
    });

    it('미지의 태그는 보존한다', () => {
      expect(sanitizeContent('<div>content</div>')).toBe('<div>content</div>');
    });

    it('HTML 엔티티는 건드리지 않는다', () => {
      expect(sanitizeContent('&amp; &lt;br&gt;')).toBe('&amp; &lt;br&gt;');
    });
  });
});
