# Contributing to AI Law Counsel

이 프로젝트에 관심을 가져 주셔서 감사합니다. 한국 법률 상담 AI를 함께 개선하는 모든 형태의 기여를 환영합니다.

## 기여 방법

### 1. 이슈 제보

- 버그, 기능 제안, 문서 개선 등은 [GitHub Issues](https://github.com/cskwork/ai-law-counsel/issues)에 등록해 주세요.
- 버그 제보 시 다음을 포함해 주세요:
  - 재현 절차
  - 예상 동작과 실제 동작
  - 환경 정보 (OS, Node 버전, 브라우저 등)
  - 가능하면 스크린샷 또는 로그

### 2. Pull Request

1. 저장소를 fork하고 새 브랜치를 만듭니다 (`feat/...`, `fix/...`, `docs/...`).
2. 변경 사항을 작성하고 테스트를 추가/갱신합니다.
3. 로컬에서 검증을 통과시킵니다:
   ```bash
   npm run lint
   npm run test:run
   npm run build
   ```
4. 커밋 메시지는 [Conventional Commits](https://www.conventionalcommits.org/) 형식을 따라 주세요:
   - `feat: 새 기능`
   - `fix: 버그 수정`
   - `docs: 문서 변경`
   - `refactor: 리팩터링`
   - `test: 테스트 추가/수정`
   - `chore: 빌드/도구 변경`
5. PR 본문에는 변경 사유, 테스트 방법, 관련 이슈 번호를 적어 주세요.

### 3. 개발 환경 셋업

```bash
git clone https://github.com/<your-username>/ai-law-counsel.git
cd ai-law-counsel
npm install
cp .env.example .env.local  # 본인 API 키로 채우세요
npm run dev
```

API 키 발급:
- `ZAI_API_KEY` — https://api.z.ai
- `LAW_API_KEY` — https://open.law.go.kr

## 코드 스타일

- TypeScript 5 / Next.js 14 App Router 컨벤션을 따릅니다.
- 함수는 짧게(50줄 이하), 파일은 응집도 높게(800줄 이하) 유지합니다.
- 불변 패턴을 선호합니다 (`...spread`, `Readonly<T>`).
- `any` 대신 `unknown`을 쓰고 안전하게 좁혀 사용합니다.
- 주석과 사용자 노출 문자열은 한국어를 기본으로 합니다.
- `console.log`는 프로덕션 코드에서 제거합니다.

## 테스트

- 새 기능과 버그 수정에는 반드시 테스트를 추가합니다.
- 테스트 도구: Vitest (단위/통합), Playwright (E2E).
- 가능하면 80% 이상의 테스트 커버리지를 유지합니다.

## 보안

- 절대 API 키, 비밀, 자격 증명을 커밋하지 마세요.
- 보안 취약점을 발견하면 공개 이슈 대신 저장소 소유자에게 비공개로 연락해 주세요.

## 도메인 주의사항

이 프로젝트는 법률 정보를 다룹니다. 기여 시 다음을 유념해 주세요:

- AI 응답은 **법률 자문이 아닌 정보 제공**임을 항상 명확히 합니다.
- 사용자에게 표시되는 모든 면책 조항(disclaimer)은 임의로 제거하지 마세요.
- 법령/판례 인용은 [국가법령정보센터](https://open.law.go.kr) 공식 출처를 따릅니다.
- 외부 API 사용 약관(Z.ai, 국가법령정보센터)을 위반하지 않는 범위에서 기여해 주세요.

## 라이선스

기여하신 모든 코드는 본 프로젝트의 [MIT License](LICENSE) 하에 배포됩니다. PR을 제출하시면 본인 기여물을 MIT 라이선스로 공개하는 데 동의한 것으로 간주합니다.

## 행동 강령

- 서로 존중하고 건설적으로 소통합니다.
- 차별, 괴롭힘, 인신공격은 허용되지 않습니다.
- 의견 충돌은 코드와 데이터, 합리적 논거로 해결합니다.

문의나 제안이 있으시면 언제든 이슈로 남겨 주세요. 감사합니다.
