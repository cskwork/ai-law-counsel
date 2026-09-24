---
name: 법률 상담 AI
description: A Korean legal Q&A counter where every answer is an issued document with checkable grounds.
colors:
  partition-green-gray: "#E9EDEB"
  ticket-paper: "#FFFFFF"
  paper-shade: "#F4F7F5"
  counter-ink: "#121A17"
  ink-secondary: "#3C4742"
  ink-tertiary: "#58645F"
  rule: "#CDD5D1"
  rule-strong: "#96A49D"
  counter-sign-green: "#0E3B34"
  counter-sign-green-hover: "#144E45"
  sign-ink: "#F0F6F3"
  led-red: "#FF5333"
  led-glass: "#110D0B"
  wayline-law-blue: "#1D5FD1"
  wayline-precedent-green: "#0C8052"
  wayline-admin-yellow: "#D69A00"
  error: "#BE2824"
typography:
  display:
    fontFamily: "Gothic A1, Apple SD Gothic Neo, Malgun Gothic, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Gothic A1, Apple SD Gothic Neo, Malgun Gothic, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 800
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.8
  label:
    fontFamily: "Gothic A1, Apple SD Gothic Neo, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 700
    lineHeight: 1.3
  led:
    fontFamily: "DotGothic16, Gothic A1, ui-monospace, monospace"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.06em"
rounded:
  chip: "3px"
  panel: "4px"
spacing:
  row-y: "12px"
  panel-x: "14px"
  gutter: "20px"
components:
  button-commit:
    backgroundColor: "{colors.counter-sign-green}"
    textColor: "{colors.sign-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.panel}"
    padding: "0 20px"
    height: "48px"
  button-commit-hover:
    backgroundColor: "{colors.counter-sign-green-hover}"
  button-stop:
    backgroundColor: "{colors.ticket-paper}"
    textColor: "{colors.error}"
    rounded: "{rounded.panel}"
    height: "48px"
  input-question:
    backgroundColor: "{colors.paper-shade}"
    textColor: "{colors.counter-ink}"
    rounded: "{rounded.panel}"
    padding: "12px 16px"
  status-board:
    backgroundColor: "{colors.led-glass}"
    textColor: "{colors.led-red}"
    typography: "{typography.led}"
    rounded: "{rounded.chip}"
    height: "36px"
  counter-panel-head:
    backgroundColor: "{colors.counter-sign-green}"
    textColor: "{colors.sign-ink}"
    padding: "10px 14px"
---

# Design System: 법률 상담 AI

## Overview

**Creative North Star: "The Civil-Service Counter (민원 창구)"**

The consultation happens at a public counter, not in a lawyer's study. A question is a numbered thermal ticket, the legal-search tools are counters that visibly take it, and the answer comes back as an issued document with its grounds listed. The world is institutional and calm: partition-wall gray-green, white paper, one deep counter-sign green, a red LED dot-matrix board for live state, and three floor wayfinding lines that mark source type everywhere.

Density is an Operate density: scan-first rows, short labels, and long legal prose given room (1.8 line height, ~48rem column). Expression lives in the precise details (perforated ticket edges, the LED glass, stamps), never in decoration over the task.

An after-hours variant (야간 창구) swaps the ground to near-black green and brightens the wayfinding lines; it follows the system setting until the user toggles it.

**Key Characteristics:**
- Sign band and counter-panel heads in deep counter-sign green; everything else neutral paper.
- Red LED dot-matrix board for live status and emergency numbers only.
- Source type always carried by the three wayfinding line colors (법령 blue, 판례 green, 행정규칙 yellow).
- States read as marks: blinking LED (processing), rotated stamp (완료, 검증됨), dashed border (검증 대기).
- Square-ish 3–4px corners, 1px rules, no gradients.

## Colors

Restrained institutional neutrals with one committed sign color and a fixed, meaningful set of wayfinding colors.

### Primary
- **Counter-Sign Green** (#0E3B34): the header sign band, counter-panel heads, and the single filled commit control (접수). Hover deepens to #144E45.

### Secondary
- **LED Red** (#FF5333) on **LED Glass** (#110D0B): the status board, processing dots, typing caret, and emergency numbers. Never used for errors or decoration.

### Tertiary
- **Wayline Law Blue** (#1D5FD1): 법령 sources, statute citations, focus ring, links.
- **Wayline Precedent Green** (#0C8052): 판례 sources; also the 완료/검증됨 stamp colour.
- **Wayline Admin Yellow** (#D69A00): 행정규칙 sources and the 안내 notice chip (dark ink on yellow; text uses #7A5600 for contrast).

### Neutral
- **Partition Green-Gray** (#E9EDEB): app ground.
- **Ticket Paper** (#FFFFFF) and **Paper Shade** (#F4F7F5): tickets, documents, panels; inputs and source ledgers.
- **Counter Ink** (#121A17), **Ink Secondary** (#3C4742), **Ink Tertiary** (#58645F): text steps; tertiary is the floor for small text (≥4.5:1 on ground).
- **Rule** (#CDD5D1) and **Rule Strong** (#96A49D): dividers, input borders, dashed ticket rules.

### Named Rules
**The Wayline Rule.** Blue, green and yellow mean 법령, 판례, 행정규칙 and nothing else. A new surface that needs an accent uses the sign green, not a wayline.

**The One Commit Rule.** Only one control per view is filled with counter-sign green: the action that submits.

## Typography

**Display Font:** Gothic A1 (with Apple SD Gothic Neo, Malgun Gothic)
**Body Font:** Noto Sans KR (with Apple SD Gothic Neo, system-ui)
**Label/Mono Font:** DotGothic16 for LED numerals and Latin on the status board

**Character:** Heavy public-signage gothic for headings and labels over a neutral reading sans for long legal text; the dot-matrix face appears only where a real LED would.

### Hierarchy
- **Display** (800, 2–2.5rem, 1.2, -0.03em): the empty-state heading 법률 상담.
- **Title** (800, 1.05rem): document section headings (h2) with a rule beneath.
- **Label** (700, 0.8–0.95rem): counter names, panel heads, buttons, stamps.
- **Body** (400, 1rem, 1.8): answers and citation text; column capped near 48rem. Root size is user-adjustable 14–18px via A-/A+.
- **LED** (DotGothic16, 0.95rem, 0.06em): status board and emergency numbers.

### Named Rules
**The Real LED Rule.** The dot-matrix face is used only on LED glass; never for body copy or as a "technical" costume.

## Layout

A fixed app shell of 100dvh: notice strip, sign band, a scrolling middle, and a composer dock pinned to the bottom at every width (safe-area aware). Content aligns to a 72rem (max-w-6xl) container with 12px/20px side padding. The empty state is a two-column grid on large screens (counters left, key art and emergency panel in a 25rem aside) and a single column on phones, where the key art is dropped so the counters come first. The thread is a single ~48rem column: user tickets right-aligned (max 70%), answer documents full column width. On phones the status board drops to its own full-width row under the sign band.

## Elevation & Depth

Paper on a wall: surfaces are flat panels lifted by a thin bottom rule plus a soft offset shadow; LED glass is recessed with an inset shadow.

### Shadow Vocabulary
- **Paper** (`0 1px 0 rgb(205 213 209 / .9), 0 6px 18px -8px rgb(18 26 23 / .18)`): panels, documents, emergency panel.
- **Lift** (`0 2px 0 rgb(205 213 209 / .9), 0 14px 30px -12px rgb(18 26 23 / .28)`): the conversation drawer.
- **Ticket** (`drop-shadow(0 4px 10px rgb(18 26 23 / .12))`): user tickets (drop-shadow so the perforated mask keeps its shadow).
- **LED glass** (`inset 0 1px 3px rgb(0 0 0 / .7)`): status board and emergency tiles.

## Shapes

Corners are nearly square: 3px for chips and small controls, 4px for panels, inputs and buttons. Tickets have a perforated top edge cut with a radial-gradient mask. Stamps are the only round shapes (pill outline, rotated -6deg). Wayfinding marks are short rounded bars (6px tall).

## Components

### Buttons
- **Shape:** near-square (4px).
- **Primary (접수):** counter-sign green fill, sign-ink label in Gothic A1 700, 48px tall; hover deepens, active nudges down 1px; disabled turns rule-gray.
- **Stop (중단):** replaces 접수 while an answer streams; paper fill, error-red outline and label with a small square glyph.
- **Secondary:** paper fill with rule-strong outline (다시 시도, 취소); destructive confirm is solid error red (모두 삭제).

### Inputs / Fields
- **Question field:** paper-shade fill, rule-strong border; focus turns the border sign green with a 2px sign-green ring at 25%.
- **Search (drawer):** same treatment at 36px with a leading magnifier and a clear button.
- **Dropzone:** dashed rule-strong border on paper shade; drag-over switches to law-blue tint.

### Navigation
- **Sign band:** menu, 법률 상담 AI signage, LED status board, A-/A+, day/night toggle; controls are 36px ghost buttons in sign-ink-2.
- **Conversation drawer:** slides from the left (min(20rem, 88vw)), sign-green head with 새 채팅, search, list rows with visible-on-touch delete, two-step 전체 삭제; Escape closes; hidden drawer is not focusable.

### Status Board (signature)
LED glass strip with a dot and the live phrase (접수 대기, 법령 검색 중, 답변 작성 중, 처리 오류); the dot blinks in steps while processing and the board is an aria-live status.

### Ticket and Document (signature)
User questions render as a perforated ticket labelled 접수 001, 002 in the LED face; answers render as a paper document with a 답변 header, ruled h2 sections, dot-marked h3, bordered tables and blockquotes, then a 참조 출처 ledger with wayline-coded types. Inline citations are law-blue tinted buttons that expand into an 원문 대조 slip with a 검증됨 stamp or dashed 검증 대기 badge.

## Do's and Don'ts

### Do:
- **Do** keep the composer dock pinned and reachable at every viewport.
- **Do** mark every source with its wayline color bar and label, never color alone.
- **Do** express state as a mark (stamp, blinking LED, dashed border) plus text.
- **Do** honor prefers-reduced-motion: feed, stamp and LED blink animations switch off.

### Don't:
- **Don't** return to navy, gold and serif "law library" styling; that is the retired look.
- **Don't** use colored left borders over 1px on cards, list items or callouts; use rules, fills or bars.
- **Don't** put LED red on anything that is not live status or an emergency number.
- **Don't** block pinch-zoom; readers rely on it alongside A-/A+.
