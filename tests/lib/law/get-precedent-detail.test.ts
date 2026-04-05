import { describe, it, expect, vi } from 'vitest';
import { parsePrecedentDetailXml, getPrecedentDetail } from '@/lib/law/get-precedent-detail';
import type { LawApiClient } from '@/lib/law/client';

describe('parsePrecedentDetailXml', () => {
  it('판례 상세 정보를 올바르게 파싱해야 한다', () => {
    const parsed = {
      PrecService: {
        판례정보일련번호: '12345',
        사건명: '손해배상(기)',
        사건번호: '2023다12345',
        선고일자: '20230915',
        선고: '선고',
        법원명: '대법원',
        사건종류명: '민사',
        판시사항: '판시사항 내용',
        판결요지: '판결요지 내용',
        참조조문: '민법 제750조',
        참조판례: '대법원 2020다12345',
        판례내용: '판례 전문 내용...',
      },
    };

    const result = parsePrecedentDetailXml(parsed);

    expect(result.precedentId).toBe('12345');
    expect(result.caseName).toBe('손해배상(기)');
    expect(result.referenceArticles).toBe('민법 제750조');
    expect(result.referencePrecedents).toBe('대법원 2020다12345');
    expect(result.fullText).toBe('판례 전문 내용...');
  });
});

describe('getPrecedentDetail', () => {
  it('클라이언트를 사용하여 판례 상세를 조회해야 한다', async () => {
    const mockParsed = {
      PrecService: {
        판례정보일련번호: '12345',
        사건명: '손해배상(기)',
        사건번호: '2023다12345',
        선고일자: '20230915',
        선고: '선고',
        법원명: '대법원',
        사건종류명: '민사',
        판시사항: '판시사항',
        판결요지: '판결요지',
        참조조문: '',
        참조판례: '',
        판례내용: '전문',
      },
    };

    const mockClient = {
      buildDetailUrl: vi.fn().mockReturnValue('https://mock-url'),
      fetchAndParse: vi.fn().mockResolvedValue(mockParsed),
    } as unknown as LawApiClient;

    const result = await getPrecedentDetail(mockClient, '12345');

    expect(mockClient.buildDetailUrl).toHaveBeenCalledWith('prec', '12345');
    expect(result.precedentId).toBe('12345');
    expect(result.fullText).toBe('전문');
  });
});
