---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/components/chat/ChatContainer.tsx"]
---

# Surface: chat (app/page.tsx)

Scope: the single chat screen (empty state, thread, composer, history slide-over, citation slips). Visitor mode: **Operate**.
Audience/job: an anxious Korean adult, often on a phone, asks a legal question or requests a document draft and needs grounded, checkable answers plus a route to human help.
Constraints: disclaimer copy verbatim and always visible; hotlines on the empty state; every existing label used by tests kept.

## Direction contract

THESIS: The consultation is a public civil-service counter (민원실), not a law-firm library. The question is a numbered ticket, the retrieval tools are counters that visibly take it, the answer is an issued document with its grounds listed. Refuses the category default of navy + gold + serif "lawyer's study" and the chat-bubble messenger.

OWN-WORLD: Institutional partition gray-green ground, white thermal-ticket and document paper, deep counter-sign green band, red LED dot-matrix status board. Three floor wayfinding line colors carry source type everywhere: 법령 blue, 판례 green, 행정규칙 yellow. Gothic A1 heavy signage headings, Noto Sans KR reading body, DotGothic16 LED numerals. Square-ish 4px corners, 1px rules, perforated ticket edges. After-hours dark variant for night reading.

STORY: The visitor sees the counter is open, picks or writes a question, watches the LED board name which counter is working (법령 검색, 판례 검색), receives a document whose citations open the official text with a verification stamp, and always sees the emergency counter numbers.

FIRST VIEWPORT: Top notice strip (disclaimer). Sign band: menu, "법률 상담 AI" signage, LED board showing live status, text-size and theme controls. Body: heading 법률 상담 plus subtitle, two counter panels (법률 상담, 문서 작성) whose rows are numbered ticket slips, emergency counter panel with big numerals, the three-line wayfinding legend. Composer dock pinned to the bottom at every width, 접수 (send) as the one filled commit control; on desktop a key-art plate of the counter hall sits beside the counters.

FORM: 민원실 번호표 and counter (position 3 of 7 on the grounded list: 법전, 발급 서류, 민원실 창구, 판결문, 내용증명 등기, 수험서 인덱스, 법령정보센터 포털). Seed key 79f67ac1.
Raises: from the hardware bench, one reserved commit color (sign green fill only on 접수/primary). From the cutting bench, the sign band owns a full region at page scale rather than scattered accents. From the one-bit desktop, states read as marks (stamp, punched, blinking LED), not only hue. From the tensegrity column, a distinct state vocabulary for each counter row (처리 중 / 완료).
Signature interaction: sending prints the ticket into the thread with a short paper-feed motion while the LED board steps through the active counter name; completion stamps each counter row.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
