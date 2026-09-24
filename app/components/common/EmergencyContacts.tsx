// 긴급 연락처 카드: 형사·긴급 상황에서 바로 누를 수 있는 전화 4종
// tel: 링크로 노출해 모바일에서 즉시 통화 가능. 키보드 포커스/스크린리더 지원.

/** 긴급 연락처 항목 */
interface EmergencyContact {
  /** 기관/서비스 이름 */
  readonly label: string;
  /** 표시 및 발신할 전화번호 */
  readonly number: string;
  /** 스크린리더용 설명 */
  readonly description: string;
}

const EMERGENCY_CONTACTS: readonly EmergencyContact[] = [
  { label: '대한법률구조공단', number: '132', description: '무료 법률 상담' },
  { label: '경찰', number: '112', description: '범죄 신고·긴급 출동' },
  { label: '여성긴급전화', number: '1366', description: '가정폭력·성폭력 상담' },
  { label: '정신건강·자살예방', number: '109', description: '24시간 위기 상담' },
];

// 긴급 창구: 전광판 숫자로 표시한 전화 4종 (tel: 링크)
export function EmergencyContacts() {
  return (
    <section
      role="region"
      aria-label="긴급 연락처"
      className="rounded-[4px] bg-paper p-4 shadow-paper"
    >
      <h2 className="font-sign text-[0.95rem] font-extrabold text-ink">긴급 연락처</h2>
      <p className="mb-3 mt-0.5 text-xs text-ink-3">사람의 도움이 급할 때 바로 전화하세요.</p>
      <ul className="grid grid-cols-2 gap-2">
        {EMERGENCY_CONTACTS.map((contact) => (
          <li key={contact.number}>
            <a
              href={`tel:${contact.number}`}
              aria-label={`${contact.label} ${contact.number} 전화 걸기, ${contact.description}`}
              className="led-board group flex flex-col gap-1 rounded-[4px] px-3 py-2.5 transition-transform duration-150 hover:-translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-way-law focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <span className="led-text tabular text-[1.6rem] leading-none">
                {contact.number}
              </span>
              <span className="text-[0.72rem] leading-snug text-[#e4dad4]">{contact.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
