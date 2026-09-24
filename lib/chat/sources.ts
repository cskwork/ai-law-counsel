/**
 * 답변 출처 관리
 * - 도구로 실제 조회한 법령·조문·판례·행정규칙을 기록(ledger)하고
 * - 최종 답변이 실제로 인용한 것만 골라 "참조 출처"로 돌려준다.
 *   (검색 결과 목록 전체를 출처로 붙이면 답변과 무관한 판례가 인용된 것처럼 보인다)
 */
import { buildPrecedentDetailUrl, buildStatuteUrl, buildExternalUrl } from '@/lib/citation/builder';
import { formatArticleLabel, normalizeArticleNumber } from '@/lib/law/article-number';
import type { SourceItem } from '@/lib/utils/sse';

interface LawRecord {
  readonly lawId: string;
  readonly lawName: string;
}

interface PrecedentRecord {
  readonly precedentId: string;
  readonly caseNumber: string;
  readonly caseName: string;
  readonly courtName: string;
}

interface RuleRecord {
  readonly ruleId: string;
  readonly ruleName: string;
}

/** 도구로 조회한 자료 기록 */
export interface SourceLedger {
  /** 법령명(공백 제거) → 법령 */
  readonly laws: Map<string, LawRecord>;
  /** 사건번호 → 판례 */
  readonly precedents: Map<string, PrecedentRecord>;
  /** 행정규칙명(공백 제거) → 행정규칙 */
  readonly rules: Map<string, RuleRecord>;
  /** 본문까지 읽은 자료 (답변에 인용 표기가 없을 때의 대체 출처) */
  readonly read: SourceItem[];
}

/** 참조 출처 최대 표시 수 */
const MAX_SOURCES = 12;
/** 판례 출처 이름에 쓰는 사건명 최대 길이 */
const MAX_CASE_NAME_LENGTH = 40;

export function createSourceLedger(): SourceLedger {
  return { laws: new Map(), precedents: new Map(), rules: new Map(), read: [] };
}

function compact(value: string): string {
  return value.replace(/\s+/g, '');
}

type Json = Record<string, unknown>;

function asItems(value: unknown): Json[] {
  return Array.isArray(value) ? value.filter((item): item is Json => typeof item === 'object' && item !== null) : [];
}

function str(value: unknown): string {
  return value === undefined || value === null ? '' : String(value).trim();
}

function addLaw(ledger: SourceLedger, lawName: string, lawId: string): void {
  if (!lawName) return;
  const key = compact(lawName);
  if (!ledger.laws.has(key)) {
    ledger.laws.set(key, { lawName, lawId });
  }
}

function addPrecedent(ledger: SourceLedger, item: Json): PrecedentRecord | undefined {
  const caseNumber = str(item.caseNumber);
  if (!caseNumber) return undefined;
  const record: PrecedentRecord = {
    precedentId: str(item.precedentId),
    caseNumber,
    caseName: str(item.caseName),
    courtName: str(item.courtName),
  };
  if (!ledger.precedents.has(caseNumber)) {
    ledger.precedents.set(caseNumber, record);
  }
  return record;
}

function statuteSource(law: LawRecord, articleNumber?: string): SourceItem {
  const label = articleNumber ? formatArticleLabel(articleNumber) : undefined;
  return {
    type: 'law',
    name: label ? `${law.lawName} ${label}` : law.lawName,
    identifier: articleNumber ? `${law.lawName}:${articleNumber}` : law.lawName,
    url: buildStatuteUrl(law.lawName, articleNumber),
  };
}

function precedentSource(record: PrecedentRecord): SourceItem {
  const caseName = record.caseName.length > MAX_CASE_NAME_LENGTH
    ? `${record.caseName.slice(0, MAX_CASE_NAME_LENGTH)}…`
    : record.caseName;
  const name = [record.courtName, record.caseNumber, caseName].filter(Boolean).join(' ');
  return {
    type: 'precedent',
    name,
    identifier: record.caseNumber,
    url: record.precedentId
      ? buildPrecedentDetailUrl(record.precedentId)
      : buildExternalUrl('precedent', record.caseNumber),
  };
}

function ruleSource(record: RuleRecord): SourceItem {
  return {
    type: 'admin_rule',
    name: record.ruleName,
    identifier: record.ruleId || record.ruleName,
    url: buildExternalUrl('rule', record.ruleName),
  };
}

/** 도구 실행 결과(JSON 문자열)를 출처 기록에 반영 */
export function recordToolResult(ledger: SourceLedger, toolName: string, result: string): void {
  let parsed: Json;
  try {
    parsed = JSON.parse(result) as Json;
  } catch {
    return;
  }

  switch (toolName) {
    case 'search_law': {
      for (const item of asItems(parsed.items)) addLaw(ledger, str(item.lawNameKo), str(item.lawId));
      for (const item of asItems(parsed.relatedArticles)) addLaw(ledger, str(item.lawName), str(item.lawId));
      break;
    }
    case 'search_law_articles': {
      for (const item of asItems(parsed.items)) addLaw(ledger, str(item.lawName), str(item.lawId));
      break;
    }
    case 'get_law_detail': {
      const lawName = str(parsed.lawNameKo);
      addLaw(ledger, lawName, str(parsed.lawId));
      const law = ledger.laws.get(compact(lawName));
      if (!law) break;
      for (const article of asItems(parsed.articles)) {
        if (!str(article.articleContent)) continue; // 목차만 받은 조문은 읽은 것으로 치지 않음
        const articleNumber = normalizeArticleNumber(str(article.articleNumber));
        if (articleNumber) ledger.read.push(statuteSource(law, articleNumber));
      }
      break;
    }
    case 'search_precedent': {
      for (const item of asItems(parsed.items)) addPrecedent(ledger, item);
      break;
    }
    case 'get_precedent_detail': {
      const record = addPrecedent(ledger, parsed);
      if (record) ledger.read.push(precedentSource(ledger.precedents.get(record.caseNumber) ?? record));
      break;
    }
    case 'search_administrative_rule': {
      for (const item of asItems(parsed.items)) {
        const ruleName = str(item.adminRuleName);
        if (ruleName && !ledger.rules.has(compact(ruleName))) {
          ledger.rules.set(compact(ruleName), { ruleName, ruleId: str(item.adminRuleId) });
        }
      }
      break;
    }
  }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 최종 답변에서 인용한 자료 중 도구로 실제 조회한 것만 출처로 선택
 * - cite: 링크와 본문 속 "근로기준법 제23조", 사건번호 언급을 모두 인식
 * - 인용 표기가 하나도 없으면 본문까지 읽은 자료를 출처로 사용
 */
export function selectCitedSources(answer: string, ledger: SourceLedger): SourceItem[] {
  const cited: SourceItem[] = [];

  // 1) cite: 링크
  for (const match of Array.from(answer.matchAll(/\(cite:([^)]+)\)/g))) {
    const [type, ...rest] = match[1].split('/').map((segment) => safeDecode(segment).trim());
    if (type === 'statute' && rest[0]) {
      const law = ledger.laws.get(compact(rest[0]));
      if (law) cited.push(statuteSource(law, rest[1] ? normalizeArticleNumber(rest[1]) : undefined));
    } else if (type === 'precedent' && rest[0]) {
      const record = ledger.precedents.get(rest.join('/'));
      if (record) cited.push(precedentSource(record));
    } else if (type === 'rule' && rest[0]) {
      const record = ledger.rules.get(compact(rest[0]));
      if (record) cited.push(ruleSource(record));
    }
  }

  // 2) 본문 속 "법령명 제N조(의M)" 언급 (긴 법령명부터 검사해 "근로기준법 시행령"을 우선)
  const laws = Array.from(ledger.laws.values()).sort((a, b) => b.lawName.length - a.lawName.length);
  for (const law of laws) {
    const pattern = new RegExp(
      `${escapeRegExp(law.lawName)}」?\\s*제\\s*(\\d+)\\s*조(?:\\s*의\\s*(\\d+))?`,
      'g',
    );
    for (const match of Array.from(answer.matchAll(pattern))) {
      const articleNumber = match[2] ? `${match[1]}-${match[2]}` : match[1];
      cited.push(statuteSource(law, articleNumber));
    }
  }

  // 3) 본문 속 사건번호 언급
  for (const record of Array.from(ledger.precedents.values())) {
    if (answer.includes(record.caseNumber)) cited.push(precedentSource(record));
  }

  const chosen = cited.length > 0 ? cited : ledger.read;
  return deduplicateSources(chosen)
    .sort((a, b) => SOURCE_ORDER[a.type] - SOURCE_ORDER[b.type])
    .slice(0, MAX_SOURCES);
}

const SOURCE_ORDER: Record<SourceItem['type'], number> = { law: 0, precedent: 1, admin_rule: 2 };

/** 중복 출처 제거 (type+identifier 기준) */
export function deduplicateSources(sources: readonly SourceItem[]): SourceItem[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = `${source.type}:${source.identifier}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
