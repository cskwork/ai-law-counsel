import type { SourceItem } from '@/lib/utils/sse';

/** 법률 인용 타입 */
export type CitationType = 'statute' | 'precedent' | 'rule';

/** 인터랙티브 인용 - 기존 SourceItem 확장 */
export interface Citation extends SourceItem {
  /** 조문/판례 전문 텍스트 (lazy load) */
  readonly fullText?: string;
  /** law.go.kr 딥링크 URL */
  readonly externalUrl?: string;
  /** MCP를 통한 출처 검증 여부 */
  readonly verified: boolean;
  /** 조문 번호 (예: "3-2") */
  readonly articleNumber?: string;
}

/** Citation API 응답 */
export interface CitationResponse {
  readonly success: boolean;
  readonly data?: {
    readonly type: CitationType;
    readonly name: string;
    readonly articleNumber?: string;
    readonly fullText: string;
    readonly externalUrl: string;
    readonly verified: boolean;
    readonly fetchedAt: string;
  };
  readonly error?: string;
}
