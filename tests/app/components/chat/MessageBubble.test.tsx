import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '@/app/components/chat/MessageBubble';

describe('MessageBubble', () => {
  describe('cite: 프로토콜 링크 렌더링', () => {
    it('cite: 링크를 CitationCard 버튼으로 렌더링해야 한다', () => {
      render(
        <MessageBubble
          role="assistant"
          content="참고: [민법 제750조](cite:statute/민법/750)를 확인하세요."
        />,
      );

      const button = screen.getByRole('button', { name: /민법 제750조/ });
      expect(button).toBeDefined();
    });

    it('cite: 링크가 일반 <a> 태그가 아닌 버튼으로 렌더링되어야 한다', () => {
      const { container } = render(
        <MessageBubble
          role="assistant"
          content="[민법 제750조](cite:statute/민법/750)"
        />,
      );

      const links = container.querySelectorAll('a[href=""]');
      expect(links.length).toBe(0);

      const citeLinks = container.querySelectorAll('a[href^="cite:"]');
      expect(citeLinks.length).toBe(0);
    });
  });

  describe('일반 링크 렌더링', () => {
    it('https: 링크를 target="_blank" <a> 태그로 렌더링해야 한다', () => {
      render(
        <MessageBubble
          role="assistant"
          content="[법률정보센터](https://www.law.go.kr)"
        />,
      );

      const link = screen.getByRole('link', { name: /법률정보센터/ });
      expect(link.getAttribute('href')).toBe('https://www.law.go.kr');
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    });
  });

  describe('XSS 방어', () => {
    it('javascript: 프로토콜 링크를 차단해야 한다', () => {
      const { container } = render(
        <MessageBubble
          role="assistant"
          content="[악성링크](javascript:alert('xss'))"
        />,
      );

      const dangerousLinks = container.querySelectorAll('a[href^="javascript:"]');
      expect(dangerousLinks.length).toBe(0);
    });
  });
});
