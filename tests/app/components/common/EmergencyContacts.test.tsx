import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EmergencyContacts } from '@/app/components/common/EmergencyContacts';

describe('EmergencyContacts', () => {
  afterEach(() => {
    cleanup();
  });

  it('긴급 연락처 4종 번호를 모두 렌더링해야 한다', () => {
    render(<EmergencyContacts />);

    expect(screen.getByText('132')).toBeInTheDocument();
    expect(screen.getByText('112')).toBeInTheDocument();
    expect(screen.getByText('1366')).toBeInTheDocument();
    expect(screen.getByText('109')).toBeInTheDocument();
  });

  it('각 번호를 tel: 링크로 노출해야 한다', () => {
    render(<EmergencyContacts />);

    expect(screen.getByRole('link', { name: /대한법률구조공단 132/ }).getAttribute('href')).toBe('tel:132');
    expect(screen.getByRole('link', { name: /경찰 112/ }).getAttribute('href')).toBe('tel:112');
    expect(screen.getByRole('link', { name: /여성긴급전화 1366/ }).getAttribute('href')).toBe('tel:1366');
    expect(screen.getByRole('link', { name: /정신건강·자살예방 109/ }).getAttribute('href')).toBe('tel:109');
  });

  it('region 역할과 한국어 aria-label로 접근성을 제공해야 한다', () => {
    render(<EmergencyContacts />);

    expect(screen.getByRole('region', { name: '긴급 연락처' })).toBeInTheDocument();
  });

  it('각 항목이 키보드로 포커스 가능한 링크여야 한다', () => {
    render(<EmergencyContacts />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
    links.forEach((link) => {
      expect(link.tagName).toBe('A');
      expect(link.getAttribute('aria-label')).toBeTruthy();
    });
  });
});
