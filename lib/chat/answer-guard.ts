/**
 * 최종 답변 품질 가드
 * - "이제 조문을 조회하겠습니다" 같은 중간 계획 문장을 최종 답변으로 내보내지 않도록 판별
 * - 스트리밍 중 같은 단어가 끝없이 반복되는 퇴행 출력을 감지
 */

/** 이 길이를 넘으면 계획 문장이 아니라 실제 답변으로 본다 */
const PLANNING_MAX_LENGTH = 600;

/** 도구 작업을 예고하는 문장 끝 ("조회하겠습니다", "검색해 보겠습니다", "확인합니다" 등) */
const PLANNING_ENDING =
  /(검색|조회|확인|찾아|살펴|알아|진행|분석|검토|정리)[가-힣\s]{0,8}(겠습니다|합니다|할게요|볼게요)[.!…~\s]*$/;

/**
 * 도구 호출 없이 돌아온 LLM 응답이 "완성된 답변"이 아닌 중간 계획 문장인지 판별
 * - 빈 응답, 짧은 작업 예고 문장, 콜론으로 끝나는 머리말을 계획으로 본다
 */
export function isPlanningMessage(text: string | null | undefined): boolean {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return true;
  if (trimmed.length > PLANNING_MAX_LENGTH) return false;

  const lastLine = trimmed.split('\n').map((line) => line.trim()).filter(Boolean).pop() ?? '';
  return PLANNING_ENDING.test(lastLine) || /[:：]$/.test(lastLine);
}

/** 반복 감지에 쓰는 꼬리 길이(문자) */
const REPETITION_WINDOW = 600;
/** 반복 판정 최소 토큰 수 */
const REPETITION_MIN_TOKENS = 40;
/** 꼬리 구간의 서로 다른 토큰이 이 수 이하이면 퇴행 반복으로 본다 */
const REPETITION_MAX_UNIQUE = 3;

/**
 * 스트리밍 출력이 같은 단어의 무한 반복(예: "Kavanaugh Kavanaugh ...")으로 퇴행했는지 판별
 */
export function isDegenerateRepetition(text: string): boolean {
  if (text.length < REPETITION_WINDOW) return false;
  const tokens = text.slice(-REPETITION_WINDOW).split(/\s+/).filter(Boolean);
  if (tokens.length < REPETITION_MIN_TOKENS) return false;
  return new Set(tokens).size <= REPETITION_MAX_UNIQUE;
}
