import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatContainer, STOPPED_NOTICE, deriveBoardStatus } from '@/app/components/chat/ChatContainer';
import type { ChatEvent } from '@/app/components/chat/MessageList';

vi.mock('@/app/components/common/EmergencyContacts', () => ({
  EmergencyContacts: () => <div data-testid="emergency-contacts" />,
}));

/** 첫 content 청크를 보낸 뒤 abort 신호가 올 때까지 열려 있는 SSE 응답 */
function hangingStreamFetch() {
  return vi.fn((_url: string, init?: RequestInit) => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"content","content":"부분 답변"}\n\n'));
        init?.signal?.addEventListener('abort', () => {
          controller.error(new DOMException('Aborted', 'AbortError'));
        });
      },
    });
    return Promise.resolve(new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } }));
  });
}

describe('ChatContainer 답변 중단', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('중단 버튼을 누르면 요청을 취소하고, 받은 부분 답변과 중단 안내를 남긴다', async () => {
    const fetchMock = hangingStreamFetch();
    vi.stubGlobal('fetch', fetchMock);
    const onSave = vi.fn();

    render(<ChatContainer onSave={onSave} />);
    fireEvent.click(screen.getByText('근로계약서 만들어줘'));

    const stopButton = await screen.findByRole('button', { name: '중단' });
    await screen.findByText('부분 답변');
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(screen.getByText(STOPPED_NOTICE)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '중단' })).not.toBeInTheDocument();
    });

    // 사용자 중단은 오류가 아니므로 재시도 버튼이 없어야 함
    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
    // 요청에 abort signal이 연결되어 있어야 함
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal).toBeInstanceOf(AbortSignal);
    // 부분 답변이 대화 기록으로 저장됨
    await waitFor(() => {
      const [messages] = onSave.mock.calls[onSave.mock.calls.length - 1];
      expect(messages).toEqual([
        { role: 'user', content: '근로계약서 만들어줘' },
        { role: 'assistant', content: '부분 답변' },
      ]);
    });
  });
});

describe('deriveBoardStatus (전광판 문구)', () => {
  const user: ChatEvent = { id: '1', type: 'message', role: 'user', content: '질문' };

  it('대기 상태에서는 접수 대기를 표시한다', () => {
    expect(deriveBoardStatus([user], false)).toBe('접수 대기');
  });

  it('도구 호출 중이면 해당 창구 이름을 표시한다', () => {
    const call: ChatEvent = { id: '2', type: 'tool_call', toolName: 'search_precedent', toolStatus: 'calling' };
    expect(deriveBoardStatus([user, call], true)).toBe('판례 검색 중');
  });

  it('답변 스트리밍 중이면 답변 작성 중을 표시한다', () => {
    const answer: ChatEvent = { id: '3', type: 'message', role: 'assistant', content: '답' };
    expect(deriveBoardStatus([user, answer], true)).toBe('답변 작성 중');
  });

  it('마지막 이벤트가 오류 안내면 처리 오류를 표시한다', () => {
    const error: ChatEvent = { id: '4', type: 'message', role: 'system', content: '오류: 실패' };
    expect(deriveBoardStatus([user, error], false)).toBe('처리 오류');
  });
});
