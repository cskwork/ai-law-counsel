import { describe, it, expect, vi } from 'vitest';
import { parseLawDetailXml, getLawDetail } from '@/lib/law/get-law-detail';
import type { LawApiClient } from '@/lib/law/client';

describe('parseLawDetailXml', () => {
  it('조문이 포함된 법령 상세를 파싱해야 한다', () => {
    const parsed = {
      법령: {
        기본정보: {
          법령ID: '001',
          법령명_한글: '민법',
          법령구분: '법률',
          소관부처: '법무부',
          공포일자: '19580222',
          시행일자: '19600101',
        },
        조문: {
          조문단위: [
            {
              조문번호: '제1조',
              조문제목: '목적',
              조문내용: '이 법은 민사에 관한 기본법이다.',
            },
            {
              조문번호: '제2조',
              조문제목: '신의성실',
              조문내용: '권리의 행사와 의무의 이행은 신의에 좇아 성실히 하여야 한다.',
            },
          ],
        },
      },
    };

    const result = parseLawDetailXml(parsed);

    expect(result.lawId).toBe('001');
    expect(result.lawNameKo).toBe('민법');
    expect(result.articles).toHaveLength(2);
    expect(result.articles[0].articleNumber).toBe('제1조');
    expect(result.articles[0].articleTitle).toBe('목적');
    expect(result.articles[1].articleContent).toContain('신의에 좇아');
  });

  it('단일 조문을 올바르게 처리해야 한다', () => {
    const parsed = {
      법령: {
        기본정보: {
          법령ID: '001',
          법령명_한글: '민법',
          법령구분: '법률',
          소관부처: '법무부',
          공포일자: '19580222',
          시행일자: '19600101',
        },
        조문: {
          조문단위: {
            조문번호: '제1조',
            조문제목: '목적',
            조문내용: '이 법은 민사에 관한 기본법이다.',
          },
        },
      },
    };

    const result = parseLawDetailXml(parsed);

    expect(result.articles).toHaveLength(1);
    expect(result.articles[0].articleNumber).toBe('제1조');
  });
});

describe('getLawDetail', () => {
  it('클라이언트를 사용하여 법령 상세를 조회해야 한다', async () => {
    const mockParsed = {
      법령: {
        기본정보: {
          법령ID: '001',
          법령명_한글: '민법',
          법령구분: '법률',
          소관부처: '법무부',
          공포일자: '19580222',
          시행일자: '19600101',
        },
        조문: {
          조문단위: [],
        },
      },
    };

    const mockClient = {
      buildDetailUrl: vi.fn().mockReturnValue('https://mock-url'),
      fetchAndParse: vi.fn().mockResolvedValue(mockParsed),
    } as unknown as LawApiClient;

    const result = await getLawDetail(mockClient, '001');

    expect(mockClient.buildDetailUrl).toHaveBeenCalledWith('law', '001');
    expect(result.lawId).toBe('001');
    expect(result.lawNameKo).toBe('민법');
  });
});
