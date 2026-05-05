# 2026-05-05 변경 로그

## Hugging Face Space sleep 방지용 GitHub Actions 추가

- 파일: `.github/workflows/keep-hf-space-awake.yml`
- 대상 Space: `csk917/korean-law-mcp` → `https://csk917-korean-law-mcp.hf.space`
- 참고: https://dev.to/0xkoji/prevent-hugging-face-spaces-from-sleeping-with-github-actions-agent-browser-2p4f

### 사실 확인 (hf CLI)

```
hf spaces info csk917/korean-law-mcp
→ stage: RUNNING, hardware: cpu-basic, sleep_time: 172800 (48h)
```

- 48시간 sleep timer가 이미 최대값으로 설정됨 → 24시간 cron으로 안전하게 reset 가능.
- `/`와 `/health` 둘 다 HTTP 200 응답 확인 (curl 직접 hit).

### 최종 설계

1. **HTTP HEAD ping 우선, agent-browser는 fallback**:
   - HF Space sleep timer는 단순 HTTP request로도 reset됨. curl 1회면 충분.
   - 원문의 agent-browser 풀 렌더링은 첫 ping이 실패할 때만 발동 → 평소 실행 시간/비용 최소화.
2. **cron**: `0 0,12 * * *` (12시간 간격, UTC). 48h sleep_time에 24h 마진 포함, GitHub의 cron 지연(최대 ~1h)도 흡수.
3. **URL 평문 하드코드**: public Space URL이라 secret 보호 가치 없음. secret 등록 단계 제거 → user는 workflow를 push하기만 하면 즉시 동작.
4. **timeout 5분**: HTTP-only 경로면 수 초 내 종료. fallback 시에만 길어짐.
5. **artifact 업로드는 fallback 시에만** (`hashFiles('page.png') != ''`).
6. **Discord webhook 제거**: 등록 부담 없애고 KISS. 필요 시 추후 추가.
7. **이전 안: secret 사용 + 무조건 agent-browser**: ping 빠르게 끝나는 일반 케이스에서 agent-browser 설치/Playwright 다운로드(분 단위)가 과함.

### 검증

- workflow_dispatch로 즉시 실행 가능.
- Actions 로그에서 "Root status: 200" / "Health status: 200" 확인하면 성공.

### TODO (사용자)

1. `git add .github/workflows/keep-hf-space-awake.yml log/changelog-2026-05-05.md`
2. 의도하면 commit/push.
3. GitHub Actions 탭에서 `Run workflow` 1회 수동 실행해 동작 확인.

주의: GitHub free tier에서 fork repo는 cron schedule이 자동 비활성화될 수 있음. main repo에서만 실행됨.
