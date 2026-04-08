import { describe, it, expect } from 'vitest';
import {
  TEMPLATE_TYPES,
  getTemplateConfig,
  isValidTemplateType,
  type TemplateType,
} from '@/lib/chat/template-types';

describe('템플릿 타입', () => {
  it('5종 템플릿이 정의되어야 한다', () => {
    expect(Object.keys(TEMPLATE_TYPES)).toHaveLength(5);
  });

  it.each(['lease', 'employment', 'demand-letter', 'power-of-attorney', 'nda'] as TemplateType[])(
    '%s 템플릿이 존재해야 한다',
    (type) => {
      expect(TEMPLATE_TYPES[type]).toBeDefined();
    },
  );

  it('각 템플릿에 필수 필드가 1개 이상 정의되어야 한다', () => {
    for (const config of Object.values(TEMPLATE_TYPES)) {
      expect(config.requiredFields.length).toBeGreaterThan(0);
    }
  });

  it('각 템플릿에 한국어 이름이 있어야 한다', () => {
    for (const config of Object.values(TEMPLATE_TYPES)) {
      expect(config.nameKo).toBeTruthy();
    }
  });

  it('각 템플릿에 관련 법률 근거가 있어야 한다', () => {
    for (const config of Object.values(TEMPLATE_TYPES)) {
      expect(config.legalBasis).toBeTruthy();
    }
  });

  describe('getTemplateConfig', () => {
    it('유효한 타입에 대해 설정을 반환해야 한다', () => {
      const config = getTemplateConfig('lease');
      expect(config).toBeDefined();
      expect(config?.nameKo).toBe('임대차 계약서');
    });

    it('잘못된 타입에 대해 undefined를 반환해야 한다', () => {
      expect(getTemplateConfig('invalid' as TemplateType)).toBeUndefined();
    });
  });

  describe('isValidTemplateType', () => {
    it('유효한 타입을 통과시켜야 한다', () => {
      expect(isValidTemplateType('lease')).toBe(true);
      expect(isValidTemplateType('nda')).toBe(true);
    });

    it('잘못된 타입을 거부해야 한다', () => {
      expect(isValidTemplateType('invalid')).toBe(false);
      expect(isValidTemplateType('')).toBe(false);
    });
  });
});
