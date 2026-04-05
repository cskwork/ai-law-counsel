import { XMLParser } from 'fast-xml-parser';

/** 검색 파라미터 */
export interface SearchParams {
  readonly query: string;
  readonly page?: number;
  readonly display?: number;
}

/** API 대상 타입 */
export type TargetType = 'law' | 'prec' | 'admrul';

/** 상세 조회 대상 타입 */
export type DetailTargetType = 'law' | 'prec';

const BASE_URL = 'https://www.law.go.kr/DRF';
const SEARCH_ENDPOINT = `${BASE_URL}/lawSearch.do`;
const DETAIL_ENDPOINT = `${BASE_URL}/lawService.do`;
const TIMEOUT_MS = 10_000;

/**
 * 국가법령정보센터 API 클라이언트
 * XML 기반 법령/판례/행정규칙 조회를 담당
 */
export class LawApiClient {
  private readonly apiKey: string;
  private readonly parser: XMLParser;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.parser = new XMLParser({
      ignoreAttributes: false,
      trimValues: true,
    });
  }

  /** 검색 URL 생성 */
  buildSearchUrl(target: TargetType, params: SearchParams): string {
    const url = new URL(SEARCH_ENDPOINT);
    url.searchParams.set('OC', this.apiKey);
    url.searchParams.set('target', target);
    url.searchParams.set('type', 'XML');
    url.searchParams.set('query', params.query);

    if (params.page !== undefined) {
      url.searchParams.set('page', String(params.page));
    }
    if (params.display !== undefined) {
      url.searchParams.set('display', String(params.display));
    }

    return url.toString();
  }

  /** 상세 조회 URL 생성 (법령은 MST, 판례는 ID 파라미터 사용) */
  buildDetailUrl(target: DetailTargetType, id: string): string {
    const url = new URL(DETAIL_ENDPOINT);
    url.searchParams.set('OC', this.apiKey);
    url.searchParams.set('target', target);
    url.searchParams.set('type', 'XML');

    if (target === 'law') {
      url.searchParams.set('MST', id);
    } else {
      url.searchParams.set('ID', id);
    }

    return url.toString();
  }

  /** XML 문자열 파싱 */
  parseXml(xml: string): Record<string, unknown> {
    return this.parser.parse(xml) as Record<string, unknown>;
  }

  /** URL에서 XML을 가져와 파싱 (타임아웃 포함) */
  async fetchAndParse(url: string): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(
          `API 요청 실패: ${response.status} ${response.statusText}`
        );
      }

      const xml = await response.text();
      return this.parseXml(xml);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * 환경변수에서 API 키를 읽어 클라이언트 생성
 * LAW_API_KEY 환경변수가 필요
 */
export function createLawApiClient(): LawApiClient {
  const apiKey = process.env.LAW_API_KEY;

  if (!apiKey) {
    throw new Error('LAW_API_KEY 환경변수가 설정되지 않았습니다');
  }

  return new LawApiClient(apiKey);
}
