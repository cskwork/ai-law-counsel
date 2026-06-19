import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CitationCard } from '@/app/components/chat/CitationCard';

describe('CitationCard', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('JSON 응답이면 인용 내용을 렌더링해야 한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              type: 'statute',
              name: '민법',
              articleNumber: '750',
              fullText: '고의 또는 과실로 인한 손해배상.',
              externalUrl: 'https://www.law.go.kr/법령/민법/제750조',
              verified: true,
              fetchedAt: '2026-04-08T00:00:00.000Z',
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      ),
    );

    render(<CitationCard citeUrl="cite:statute/민법/750">민법 제750조</CitationCard>);

    fireEvent.click(screen.getByRole('button', { name: '민법 제750조' }));

    await waitFor(() => {
      expect(screen.getByText('고의 또는 과실로 인한 손해배상.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /law.go.kr에서 보기/ })).toBeInTheDocument();
    });
  });

  it('펼침 시 AI 요약과 공식 원문 대조 안내문을 노출해야 한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              type: 'statute',
              name: '민법',
              articleNumber: '750',
              fullText: '고의 또는 과실로 인한 손해배상.',
              externalUrl: 'https://www.law.go.kr/법령/민법/제750조',
              verified: true,
              fetchedAt: '2026-04-08T00:00:00.000Z',
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      ),
    );

    render(<CitationCard citeUrl="cite:statute/민법/750">민법 제750조</CitationCard>);

    fireEvent.click(screen.getByRole('button', { name: '민법 제750조' }));

    await waitFor(() => {
      expect(screen.getByText('AI 요약과 아래 공식 원문을 직접 대조하세요.')).toBeInTheDocument();
    });
  });

  it('검증되지 않은 인용은 검증 대기 중 안내를 표시해야 한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              type: 'statute',
              name: '민법',
              articleNumber: '750',
              fullText: '고의 또는 과실로 인한 손해배상.',
              externalUrl: 'https://www.law.go.kr/법령/민법/제750조',
              verified: false,
              fetchedAt: '2026-04-08T00:00:00.000Z',
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      ),
    );

    render(<CitationCard citeUrl="cite:statute/민법/750">민법 제750조</CitationCard>);

    fireEvent.click(screen.getByRole('button', { name: '민법 제750조' }));

    await waitFor(() => {
      const pending = screen.getByText('검증 대기 중');
      expect(pending).toBeInTheDocument();
      expect(pending.closest('span')?.getAttribute('title')).toContain('직접 확인');
    });
  });

  it('HTML 에러 페이지가 와도 JSON 파싱 예외를 사용자 에러 메시지로 처리해야 한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          '<!DOCTYPE html><html><body>404</body></html>',
          {
            status: 404,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          },
        ),
      ),
    );

    render(<CitationCard citeUrl="cite:statute/민법/750">민법 제750조</CitationCard>);

    fireEvent.click(screen.getByRole('button', { name: '민법 제750조' }));

    await waitFor(() => {
      expect(
        screen.getByText('인용 서비스 응답 형식이 올바르지 않습니다. 잠시 후 다시 시도해주세요.'),
      ).toBeInTheDocument();
    });
  });
});
