import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LawSearchResult, LawDetail, PrecedentSearchResult, PrecedentDetail } from '@/lib/law/types';

vi.mock('@/lib/law/client', () => ({
  createLawApiClient: vi.fn(() => ({})),
}));

vi.mock('@/lib/law/search-law', () => ({
  searchLaw: vi.fn(),
}));

vi.mock('@/lib/law/get-law-detail', () => ({
  getLawDetail: vi.fn(),
}));

vi.mock('@/lib/law/search-precedent', () => ({
  searchPrecedent: vi.fn(),
}));

vi.mock('@/lib/law/get-precedent-detail', () => ({
  getPrecedentDetail: vi.fn(),
}));

import { searchLaw } from '@/lib/law/search-law';
import { getLawDetail } from '@/lib/law/get-law-detail';
import { searchPrecedent } from '@/lib/law/search-precedent';
import { getPrecedentDetail } from '@/lib/law/get-precedent-detail';

const importRoute = () => import('@/app/api/citation/route');

function createRequest(params: Record<string, string>): Request {
  const url = new URL('http://localhost:3000/api/citation');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString());
}

describe('GET /api/citation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('법령 인용 조회 시 200 응답을 반환해야 한다', async () => {
    vi.mocked(searchLaw).mockResolvedValue({
      totalCount: 1,
      items: [{ lawId: '001234', lawNameKo: '주택임대차보호법', lawAbbreviation: '', lawType: '법률', department: '', promulgationDate: '', promulgationNumber: '', enforcementDate: '', amendmentType: '', detailLink: 'https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=276291' }],
    } satisfies LawSearchResult);

    vi.mocked(getLawDetail).mockResolvedValue({
      lawId: '001234',
      lawNameKo: '주택임대차보호법',
      lawType: '법률',
      department: '법무부',
      promulgationDate: '',
      enforcementDate: '',
      articles: [{ articleNumber: '3-2', articleTitle: '보증금의 회수', articleContent: '임차인이...' }],
    } satisfies LawDetail);

    const { GET } = await importRoute();
    const request = createRequest({ type: 'statute', id: '주택임대차보호법', article: '3-2' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.type).toBe('statute');
    expect(body.data.name).toBe('주택임대차보호법');
    expect(body.data.fullText).toContain('임차인이');
    expect(body.data.externalUrl).toContain('lsiSeq=276291');
    expect(vi.mocked(getLawDetail)).toHaveBeenCalledWith(expect.anything(), '001234', {
      articleJo: '000302',
      lawIdentifierType: 'ID',
    });
  });

  it('판례 인용 조회 시 200 응답을 반환해야 한다', async () => {
    vi.mocked(searchPrecedent).mockResolvedValue({
      totalCount: 1,
      items: [{ precedentId: 'PREC_567', caseName: '손해배상 판결', caseNumber: '2023다12345', judgmentDate: '', judgment: '', courtName: '', caseType: '', holding: '', summary: '요지...' }],
    } satisfies PrecedentSearchResult);

    vi.mocked(getPrecedentDetail).mockResolvedValue({
      precedentId: 'PREC_567',
      caseName: '손해배상 판결',
      caseNumber: '2023다12345',
      judgmentDate: '',
      judgment: '',
      courtName: '대법원',
      caseType: '민사',
      holding: '',
      summary: '요지...',
      referenceArticles: '',
      referencePrecedents: '',
      fullText: '판결 전문...',
    } satisfies PrecedentDetail);

    const { GET } = await importRoute();
    const request = createRequest({ type: 'precedent', id: '2023다12345' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.type).toBe('precedent');
    expect(body.data.fullText).toContain('판결 전문');
    expect(vi.mocked(getPrecedentDetail)).toHaveBeenCalledWith(expect.anything(), 'PREC_567');
  });

  it('검색 결과 없을 때 미검증 응답을 반환해야 한다', async () => {
    vi.mocked(searchLaw).mockResolvedValue({ totalCount: 0, items: [] });

    const { GET } = await importRoute();
    const request = createRequest({ type: 'statute', id: '존재하지않는법', article: '1' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.verified).toBe(false);
    expect(body.data.fullText).toBe('해당 법령을 찾을 수 없습니다.');
  });

  it('의 조문 번호도 정상 매칭해야 한다', async () => {
    vi.mocked(searchLaw).mockResolvedValue({
      totalCount: 1,
      items: [{ lawId: '001234', lawNameKo: '주택임대차보호법', lawAbbreviation: '', lawType: '법률', department: '', promulgationDate: '', promulgationNumber: '', enforcementDate: '', amendmentType: '', detailLink: 'https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=276291' }],
    } satisfies LawSearchResult);

    vi.mocked(getLawDetail).mockResolvedValue({
      lawId: '001234',
      lawNameKo: '주택임대차보호법',
      lawType: '법률',
      department: '법무부',
      promulgationDate: '',
      enforcementDate: '',
      articles: [{ articleNumber: '3-2', articleTitle: '보증금의 회수', articleContent: '임차인이...' }],
    } satisfies LawDetail);

    const { GET } = await importRoute();
    const request = createRequest({ type: 'statute', id: '주택임대차보호법', article: '3의2' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.articleNumber).toBe('3-2');
    expect(body.data.fullText).toContain('임차인이');
  });

  it('필수 파라미터 누락 시 400 응답을 반환해야 한다', async () => {
    const { GET } = await importRoute();
    const request = createRequest({ type: 'statute' }); // id 누락
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('외부 API 호출 실패 시 검증 대기 응답을 반환해야 한다', async () => {
    vi.mocked(searchLaw).mockRejectedValue(new Error('fetch failed'));

    const { GET } = await importRoute();
    const request = createRequest({ type: 'statute', id: '민법', article: '750' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.verified).toBe(false);
    expect(body.data.fullText).toContain('원문을 확인');
  });
});
