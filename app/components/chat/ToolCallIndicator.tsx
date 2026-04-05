import { LoadingDots } from '@/app/components/common/LoadingDots';

// 도구 호출명 -> 한국어 라벨 매핑
const TOOL_LABELS: Record<string, string> = {
  search_law: '법령 검색',
  get_law_detail: '법령 조문 조회',
  search_precedent: '판례 검색',
  get_precedent_detail: '판례 상세 조회',
  search_administrative_rule: '행정규칙 검색',
  clarify_situation: '추가 질문 준비',
};

interface ToolCallIndicatorProps {
  toolName: string;
  status: 'calling' | 'done';
  summary?: string;
}

// 도구 호출 상태 표시 컴포넌트 (호출 중/완료)
export function ToolCallIndicator({ toolName, status, summary }: ToolCallIndicatorProps) {
  const label = TOOL_LABELS[toolName] ?? toolName;

  return (
    <div className="flex items-center gap-2 my-1 ml-2 text-xs text-gray-500">
      <span className="inline-block h-4 w-4 rounded bg-blue-100 text-blue-600 text-center leading-4 text-[10px] font-bold">
        {status === 'calling' ? '...' : 'OK'}
      </span>
      <span>{label}</span>
      {status === 'calling' && <LoadingDots />}
      {status === 'done' && summary && (
        <span className="text-gray-400">- {summary}</span>
      )}
    </div>
  );
}
