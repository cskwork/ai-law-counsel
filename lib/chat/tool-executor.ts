/**
 * 도구 실행기
 * - LLM 도구 호출을 실행 함수로 포워딩
 * - clarify_situation은 로컬 처리
 */
/** 도구 실행에 필요한 의존성 인터페이스 */
export interface ToolExecutorDeps {
  callTool: (name: string, args: Record<string, unknown>) => Promise<string>;
}

/**
 * 도구 호출 실행
 * - 일반 도구는 실행 함수로 포워딩
 * - clarify_situation은 로컬 처리
 */
export async function executeToolCall(
  toolName: string,
  argsJson: string,
  deps: ToolExecutorDeps,
): Promise<string> {
  // JSON 파싱
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsJson) as Record<string, unknown>;
  } catch {
    return `도구 인자 JSON 파싱 오류: ${argsJson}`;
  }

  // clarify_situation은 로컬 처리
  if (toolName === 'clarify_situation') {
    return `[추가 질문] ${args.question as string}`;
  }

  // 도구 실행 함수로 포워딩
  try {
    return await deps.callTool(toolName, args);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return `도구 실행 오류 (${toolName}): ${message}`;
  }
}
