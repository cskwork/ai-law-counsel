import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from '@/app/components/chat/Sidebar';
import type { StoredConversation } from '@/app/types/conversation';

function conv(id: string, title: string): StoredConversation {
  const now = new Date().toISOString();
  return { id, title, createdAt: now, updatedAt: now, messages: [{ role: 'user', content: title }], events: [] };
}

const conversations = [conv('a', '전세 보증금 반환'), conv('b', '부당해고 대처')];

function renderSidebar(overrides: Partial<Parameters<typeof Sidebar>[0]> = {}) {
  const props = {
    conversations,
    activeId: null,
    isOpen: true,
    onClose: vi.fn(),
    onSelect: vi.fn(),
    onNew: vi.fn(),
    onDelete: vi.fn(),
    onDeleteAll: vi.fn(),
    ...overrides,
  };
  render(<Sidebar {...props} />);
  return props;
}

describe('Sidebar', () => {
  afterEach(() => cleanup());

  it('검색어로 대화 목록을 좁힌다', () => {
    renderSidebar();
    fireEvent.change(screen.getByLabelText('대화 검색'), { target: { value: '해고' } });
    expect(screen.getByText('부당해고 대처')).toBeInTheDocument();
    expect(screen.queryByText('전세 보증금 반환')).not.toBeInTheDocument();
  });

  it('검색 결과가 없으면 안내 문구를 보여준다', () => {
    renderSidebar();
    fireEvent.change(screen.getByLabelText('대화 검색'), { target: { value: '상속' } });
    expect(screen.getByRole('status')).toHaveTextContent('맞는 대화가 없습니다');
  });

  it('전체 삭제는 확인 단계를 거친다', () => {
    const props = renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: '전체 삭제' }));
    expect(props.onDeleteAll).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(props.onDeleteAll).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '전체 삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '모두 삭제' }));
    expect(props.onDeleteAll).toHaveBeenCalledTimes(1);
  });

  it('개별 삭제 버튼은 선택 버튼 안에 중첩되지 않는다', () => {
    const props = renderSidebar();
    const deleteButton = screen.getByRole('button', { name: '"전세 보증금 반환" 대화 삭제' });
    expect(deleteButton.parentElement?.closest('button')).toBeNull();
    fireEvent.click(deleteButton);
    expect(props.onDelete).toHaveBeenCalledWith('a');
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it('Escape 키로 닫힌다', () => {
    const props = renderSidebar();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
