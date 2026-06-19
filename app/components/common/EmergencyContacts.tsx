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

// 긴급 연락처를 카드 리스트로 렌더 (변호사의 서재 톤)
export function EmergencyContacts() {
  return (
    <section
      role="region"
      aria-label="긴급 연락처"
      className="rounded-lg border border-border-subtle bg-surface-elevated p-4 shadow-sm"
    >
      <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-ink-primary">
        <span aria-hidden="true" className="inline-block h-3 w-px bg-accent-gold" />
        긴급 연락처
      </h2>
      <ul className="grid grid-cols-2 gap-2">
        {EMERGENCY_CONTACTS.map((contact) => (
          <li key={contact.number}>
            <a
              href={`tel:${contact.number}`}
              aria-label={`${contact.label} ${contact.number} 전화 걸기, ${contact.description}`}
              className="flex flex-col gap-0.5 rounded-md border border-border-default bg-surface-sunken px-3 py-2 transition-colors hover:border-accent-gold hover:bg-accent-gold-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold"
            >
              <span className="text-xs text-ink-tertiary">{contact.label}</span>
              <span className="font-display text-base font-semibold tracking-wide text-authority-deep">
                {contact.number}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
