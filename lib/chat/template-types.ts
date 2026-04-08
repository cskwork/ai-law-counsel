/** 법률 문서 템플릿 타입 */
export type TemplateType = 'lease' | 'employment' | 'demand-letter' | 'power-of-attorney' | 'nda';

/** 템플릿 설정 */
export interface TemplateConfig {
  readonly nameKo: string;
  readonly requiredFields: readonly string[];
  readonly legalBasis: string;
}

/** 5종 법률 문서 템플릿 정의 */
export const TEMPLATE_TYPES: Record<TemplateType, TemplateConfig> = {
  lease: {
    nameKo: '임대차 계약서',
    requiredFields: [
      '임대인 정보 (이름, 주소)',
      '임차인 정보 (이름, 주소)',
      '부동산 소재지',
      '보증금 (금액)',
      '월 차임 (금액)',
      '계약 기간 (시작일, 종료일)',
      '특약 사항',
    ],
    legalBasis: '주택임대차보호법, 민법 제618조~제654조',
  },
  employment: {
    nameKo: '근로계약서',
    requiredFields: [
      '사업주 정보 (상호, 대표자, 주소)',
      '근로자 정보 (이름, 주소)',
      '근무 장소',
      '업무 내용',
      '근로 시간 (시작, 종료)',
      '임금 (금액, 지급일)',
      '계약 기간',
      '휴일',
    ],
    legalBasis: '근로기준법 제17조, 제2조',
  },
  'demand-letter': {
    nameKo: '내용증명',
    requiredFields: [
      '발신인 정보 (이름, 주소)',
      '수신인 정보 (이름, 주소)',
      '요구 사항 (구체적 내용)',
      '관련 사실관계',
      '이행 기한',
      '불이행 시 조치 사항',
    ],
    legalBasis: '민법 제387조(이행의 최고), 우편법',
  },
  'power-of-attorney': {
    nameKo: '위임장',
    requiredFields: [
      '위임인 정보 (이름, 주민등록번호, 주소)',
      '수임인 정보 (이름, 주민등록번호, 주소)',
      '위임 사항 (구체적 내용)',
      '위임 기간',
      '대리권 범위',
    ],
    legalBasis: '민법 제114조~제136조 (대리)',
  },
  nda: {
    nameKo: '비밀유지계약서(NDA)',
    requiredFields: [
      '공개자 정보 (상호/이름, 주소)',
      '수령자 정보 (상호/이름, 주소)',
      '비밀정보 정의 (범위)',
      '비밀유지 기간',
      '비밀정보 사용 목적',
      '위반 시 손해배상 조항',
    ],
    legalBasis: '부정경쟁방지 및 영업비밀보호에 관한 법률',
  },
};

/** 템플릿 설정 조회 */
export function getTemplateConfig(type: TemplateType): TemplateConfig | undefined {
  return TEMPLATE_TYPES[type];
}

/** 유효한 템플릿 타입 여부 확인 */
export function isValidTemplateType(type: string): type is TemplateType {
  return type in TEMPLATE_TYPES;
}
