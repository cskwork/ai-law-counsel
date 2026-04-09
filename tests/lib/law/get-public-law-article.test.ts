import { describe, expect, it } from 'vitest';
import { __testables } from '@/lib/law/get-public-law-article';

describe('get-public-law-article', () => {
  it('wrapper HTML에서 iframe src를 추출해야 한다', () => {
    const html = `
      <html>
        <body>
          <iframe src="/LSW//lsInfoP.do?lsiSeq=284415&amp;chrClsCd=010202&amp;urlMode=lsInfoP&amp;efYd=20260317&amp;ancYnChk=0"></iframe>
        </body>
      </html>
    `;

    expect(__testables.extractIframeSrc(html)).toBe(
      '/LSW//lsInfoP.do?lsiSeq=284415&chrClsCd=010202&urlMode=lsInfoP&efYd=20260317&ancYnChk=0',
    );
  });

  it('iframe src로 공개 본문 URL을 구성해야 한다', () => {
    const url = __testables.buildPublicBodyUrl(
      '민법',
      '/LSW//lsInfoP.do?lsiSeq=284415&chrClsCd=010202&urlMode=lsInfoP&efYd=20260317&ancYnChk=0',
    );

    expect(url.toString()).toContain('lsInfoR.do');
    expect(url.searchParams.get('lsiSeq')).toBe('284415');
    expect(url.searchParams.get('efYd')).toBe('20260317');
    expect(url.searchParams.get('efYn')).toBe('Y');
  });

  it('조문 시작 블록부터 다음 조문 전까지 section을 추출해야 한다', () => {
    const bodyHtml = `
      <p class="pty1_p4"><span class="bl"><label> 제8조(보증금 중 일정액의 보호) </label></span> ① 임차인은 보증금 중 일정액을 우선하여 변제받을 권리가 있다. </p>
      <p class="pty1_de2_1">② 제1항의 경우에는 제3조의2제4항부터 제6항까지의 규정을 준용한다.</p>
      <p class="pty1_de2_1">③ 제1항에 따라 우선변제를 받을 임차인 및 보증금 중 일정액의 범위는 대통령령으로 정한다.</p>
      <p class="pty1_p4"><span class="bl"><label> 제8조의2(주택임대차위원회) </label></span> ① 위원회를 둔다. </p>
    `;

    const section = __testables.extractArticleSection(bodyHtml, '제8조');

    expect(section).toContain('보증금 중 일정액의 보호');
    expect(section).toContain('② 제1항의 경우에는');
    expect(section).not.toContain('제8조의2');
  });

  it('조문 section HTML에서 제목과 각 항을 추출해야 한다', () => {
    const sectionHtml = `
      <p class="pty1_p4"><span class="bl"><label> 제750조(불법행위의 내용) </label></span> 고의 또는 과실로 인한 위법행위로 타인에게 손해를 가한 자는 그 손해를 배상할 책임이 있다. </p>
      <p class="pty1_de2_1">② 후속 단락 예시</p>
    `;

    const text = __testables.extractArticleText(sectionHtml, '제750조');

    expect(text).toBe(
      '불법행위의 내용\n고의 또는 과실로 인한 위법행위로 타인에게 손해를 가한 자는 그 손해를 배상할 책임이 있다.\n② 후속 단락 예시',
    );
  });

  it('HTML 엔티티와 태그를 일반 텍스트로 정리해야 한다', () => {
    expect(
      __testables.stripHtml('<p>① 본문 <a href="#">링크</a> <span class="sfon">&lt;개정 2026. 1. 1.&gt;</span></p>'),
    ).toBe('① 본문 링크 <개정 2026. 1. 1.>');
  });
});
