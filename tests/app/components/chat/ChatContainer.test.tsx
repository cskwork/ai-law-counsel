import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatContainer } from '@/app/components/chat/ChatContainer';

// Unit 2가 병렬로 만드는 컴포넌트 — 본 테스트는 흐름만 검증하므로 모킹
vi.mock('@/app/components/common/EmergencyContacts', () => ({
  EmergencyContacts: () => <div data-testid="emergency-contacts" />,
}));

/** content-type이 application/json인 200 응답 헬퍼 (SSE 본문 문자열을 그대로 스트림으로 전달) */
function sseResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  });
}

describe('ChatContainer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('빈 상태(추천 질문 화면)', () => {
    it('카테고리 소제목과 긴급 연락처를 함께 렌더해야 한다', () => {
      render(<ChatContainer />);

      // '법률 상담'은 빈 상태 제목과 그룹 소제목 두 곳에 등장
      expect(screen.getByRole('heading', { name: '법률 상담', level: 3 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: '문서 작성', level: 3 })).toBeInTheDocument();
      expect(screen.getByTestId('emergency-contacts')).toBeInTheDocument();
    });
  });

  describe('스트림 오류 시 재시도', () => {
    it("SSE 'error' 이벤트가 오면 '다시 시도' 버튼을 노출해야 한다", async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          sseResponse('data: {"type":"error","message":"검색 실패"}\n\n'),
        ),
      );

      render(<ChatContainer />);

      fireEvent.click(screen.getByText('임대차 계약서 작성해줘'));

      await waitFor(() => {
        expect(screen.getByText(/오류: 검색 실패/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
      });
    });

    it("'다시 시도' 클릭 시 동일 입력으로 재전송하고, 성공하면 버튼이 사라져야 한다", async () => {
      const fetchMock = vi
        .fn()
        // 1차: 오류 이벤트
        .mockResolvedValueOnce(
          sseResponse('data: {"type":"error","message":"검색 실패"}\n\n'),
        )
        // 2차(재시도): 정상 응답
        .mockResolvedValueOnce(
          sseResponse('data: {"type":"content","content":"답변입니다."}\n\ndata: {"type":"done"}\n\n'),
        );
      vi.stubGlobal('fetch', fetchMock);

      render(<ChatContainer />);

      fireEvent.click(screen.getByText('근로계약서 만들어줘'));

      const retryButton = await screen.findByRole('button', { name: '다시 시도' });
      fireEvent.click(retryButton);

      // 재시도 성공 후 버튼이 숨겨지고, 동일 입력으로 두 번 전송됨
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
        expect(screen.getByText('답변입니다.')).toBeInTheDocument();
      });

      // 재시도는 동일한 사용자 입력 텍스트로 재전송된다 (handleSend 재사용)
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const secondBody = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);
      const lastUserMessage = secondBody.messages[secondBody.messages.length - 1];
      expect(lastUserMessage).toEqual({ role: 'user', content: '근로계약서 만들어줘' });
    });

    it('fetch 자체가 실패해도 재시도 버튼을 노출해야 한다', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('네트워크 단절')));

      render(<ChatContainer />);

      fireEvent.click(screen.getByText('내용증명 작성을 도와주세요'));

      await waitFor(() => {
        expect(screen.getByText(/오류: 네트워크 단절/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
      });
    });

    it('재시도가 상한(3회)에 도달하면 버튼 대신 안내 문구를 표시해야 한다', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          sseResponse('data: {"type":"error","message":"검색 실패"}\n\n'),
        ),
      );

      render(<ChatContainer />);

      fireEvent.click(screen.getByText('임대차 계약서 작성해줘'));

      // 최초 오류 후 3회 재시도 → 카운터가 상한에 도달
      for (let i = 0; i < 3; i++) {
        const retryButton = await screen.findByRole('button', { name: '다시 시도' });
        fireEvent.click(retryButton);
      }

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
        expect(screen.getByText(/재시도 횟수를 초과/)).toBeInTheDocument();
      });
    });
  });
});
