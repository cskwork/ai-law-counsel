import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FileUpload } from '@/app/components/chat/FileUpload';

describe('FileUpload 접근성', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('드롭존이 role="button"과 tabindex=0, aria-label을 가져야 한다', () => {
    render(<FileUpload onUploadComplete={() => {}} />);

    const dropzone = screen.getByRole('button', { name: /문서 업로드/ });
    expect(dropzone).toHaveAttribute('tabindex', '0');
    expect(dropzone).toHaveAttribute('aria-label');
  });

  it('Enter 키 입력 시 숨겨진 파일 input의 클릭을 트리거해야 한다', () => {
    const { container } = render(<FileUpload onUploadComplete={() => {}} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {});

    const dropzone = screen.getByRole('button', { name: /문서 업로드/ });
    fireEvent.keyDown(dropzone, { key: 'Enter' });

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('Space 키 입력 시에도 파일 input의 클릭을 트리거해야 한다', () => {
    const { container } = render(<FileUpload onUploadComplete={() => {}} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {});

    const dropzone = screen.getByRole('button', { name: /문서 업로드/ });
    fireEvent.keyDown(dropzone, { key: ' ' });

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('disabled 상태에서는 키보드로도 파일 선택을 트리거하지 않아야 한다', () => {
    const { container } = render(<FileUpload onUploadComplete={() => {}} disabled />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {});

    const dropzone = screen.getByRole('button', { name: /문서 업로드/ });
    fireEvent.keyDown(dropzone, { key: 'Enter' });

    expect(clickSpy).not.toHaveBeenCalled();
  });
});
