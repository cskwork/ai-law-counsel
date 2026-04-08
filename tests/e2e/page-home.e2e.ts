import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('메인 페이지 (/)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('페이지 제목과 면책 고지가 표시되어야 한다', async ({ page }) => {
    // 헤더 제목
    await expect(page.locator('h1')).toContainText('법률 상담 AI');

    // 면책 고지 배너
    const disclaimer = page.locator('text=본 서비스는 AI 기반 법률 정보 제공');
    await expect(disclaimer).toBeVisible();

    // 문서 분석 면책 문구 추가 확인
    await expect(page.locator('text=문서 분석 결과는 참고용')).toBeVisible();
  });

  test('추천 질문 버튼이 표시되어야 한다', async ({ page }) => {
    // 기존 법률 질문
    await expect(page.locator('text=전세 보증금을 돌려받지 못하면')).toBeVisible();

    // 템플릿 관련 추천 질문 (US3)
    await expect(page.locator('text=임대차 계약서 작성해줘')).toBeVisible();
    await expect(page.locator('text=근로계약서 만들어줘')).toBeVisible();
    await expect(page.locator('text=내용증명 작성을 도와주세요')).toBeVisible();
  });

  test('사이드바 토글이 동작해야 한다', async ({ page }) => {
    // 사이드바 토글 버튼 클릭
    const toggleButton = page.locator('button[title="대화 목록"]');
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();

    // 사이드바 열림 확인 ("새 채팅" 버튼)
    await expect(page.locator('text=새 채팅')).toBeVisible();
  });

  test('채팅 입력 필드가 존재해야 한다', async ({ page }) => {
    const input = page.locator('textarea, input[type="text"]').first();
    await expect(input).toBeVisible();
  });

  test('파일 업로드 영역이 존재해야 한다', async ({ page }) => {
    // FileUpload 컴포넌트의 드래그 앤 드롭 영역
    await expect(page.locator('text=PDF, DOCX, TXT')).toBeVisible();
    await expect(page.locator('text=파일을 여기에 끌어놓거나 클릭하세요')).toBeVisible();

    // hidden file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveCount(1);
    await expect(fileInput).toHaveAttribute('accept', '.pdf,.docx,.txt');
  });
});

test.describe('파일 업로드 플로우 (US1)', () => {
  test('TXT 파일 업로드 시 문서 배지가 표시되어야 한다', async ({ page }) => {
    await page.goto('/');

    // API 응답 인터셉트
    const uploadPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/upload'),
      { timeout: 15_000 },
    );

    const fileInput = page.locator('input[type="file"]');
    const fixturePath = path.join(__dirname, 'fixtures', 'sample-contract.txt');
    await fileInput.setInputFiles(fixturePath);

    // API 응답 검증
    const uploadResponse = await uploadPromise;
    expect(uploadResponse.status()).toBe(200);
    const body = await uploadResponse.json();
    expect(body.success).toBe(true);
    expect(body.data.extractedText).toContain('제1조');

    // 문서 컨텍스트 배지 (항상 ChatInput 위에 표시)
    await expect(page.locator('text=sample-contract.txt')).toBeVisible({ timeout: 5_000 });

    // 제거 버튼 존재 확인
    await expect(page.locator('button[title="문서 제거"]')).toBeVisible();
  });

  test('업로드된 문서의 제거 버튼이 동작해야 한다', async ({ page }) => {
    await page.goto('/');

    const uploadPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/upload'),
      { timeout: 15_000 },
    );

    const fileInput = page.locator('input[type="file"]');
    const fixturePath = path.join(__dirname, 'fixtures', 'sample-contract.txt');
    await fileInput.setInputFiles(fixturePath);

    await uploadPromise;
    await expect(page.locator('text=sample-contract.txt')).toBeVisible({ timeout: 5_000 });

    // 문서 제거 버튼 클릭
    const removeButton = page.locator('button[title="문서 제거"]');
    await removeButton.click();

    // 문서 배지가 사라져야 함
    await expect(removeButton).not.toBeVisible();
  });

  test('미지원 형식 업로드 시 에러가 표시되어야 한다', async ({ page }) => {
    await page.goto('/');

    const fileInput = page.locator('input[type="file"]');

    // 가짜 PNG 파일 생성 후 업로드
    await fileInput.setInputFiles({
      name: 'image.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-png'),
    });

    // 에러 메시지 확인
    await expect(page.locator('text=지원하지 않는 파일 형식')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('추천 질문 클릭 플로우', () => {
  test('추천 질문 클릭 시 채팅이 시작되어야 한다', async ({ page }) => {
    await page.goto('/');

    // 추천 질문 클릭
    const questionButton = page.locator('button:has-text("임대차 계약서 작성해줘")');
    await expect(questionButton).toBeVisible();
    await questionButton.click();

    // 사용자 메시지가 표시되어야 함
    await expect(page.locator('text=임대차 계약서 작성해줘').last()).toBeVisible();

    // 추천 질문 영역이 사라지고 메시지 목록이 표시되어야 함
    await expect(questionButton).not.toBeVisible({ timeout: 3_000 });
  });
});

test.describe('반응형 레이아웃', () => {
  test('데스크톱에서 레이아웃이 정상 렌더링되어야 한다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('법률 상담 AI');
    await expect(page.locator('text=PDF, DOCX, TXT')).toBeVisible();
  });

  test('모바일에서 레이아웃이 정상 렌더링되어야 한다', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('법률 상담 AI');
    await expect(page.locator('text=PDF, DOCX, TXT')).toBeVisible();
  });
});
