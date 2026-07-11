# 👨‍👧‍👦 서울아빠들

3명이 함께 쓰는 팀 업무 공간 웹앱입니다.

## 기능

| 메뉴 | 설명 |
|------|------|
| 📊 대시보드 | 오늘 일정, 공지, 내 할 일을 한눈에 |
| 📦 상품마스터 | 상품 등록·검색·수정, CSV 내보내기/가져오기, 상품별 구글드라이브 링크 연결 |
| 📁 자료실 | 구글드라이브 폴더·시트·문서 링크를 카테고리별로 정리 |
| 📅 일정 | 팀 공유 캘린더 |
| 📋 할 일 | 칸반 보드 (할 일 → 진행 중 → 완료), 담당자·마감일 지정 |
| 💬 팀 채팅 | 실시간 채팅 |
| 📢 공지사항 | 공지 작성, 📌 고정 |

## 두 가지 모드

- **체험 모드** (기본): 아무 설정 없이 바로 실행됩니다. 데이터는 내 브라우저에만 저장됩니다.
- **팀 공유 모드**: Supabase를 연결하면 3명이 같은 데이터를 실시간으로 공유합니다. (무료)

## 1. 로컬에서 실행해보기

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 접속 → 이름 입력하고 입장.

## 2. 팀 공유 모드 만들기 (Supabase 연결, 약 10분)

1. https://supabase.com 에서 무료 가입 후 **New Project** 생성
2. 왼쪽 메뉴 **SQL Editor** → 이 저장소의 `supabase/schema.sql` 파일 내용을 붙여넣고 **Run**
3. 왼쪽 메뉴 **Settings → API** 에서 두 값을 복사:
   - `Project URL`
   - `anon public` 키
4. 프로젝트 루트에 `.env.local` 파일 생성:

```
NEXT_PUBLIC_SUPABASE_URL=복사한_Project_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=복사한_anon_키
```

5. 다시 실행(`npm run dev`)하면 사이드바에 **"팀 공유 모드"** 라고 표시됩니다.

## 3. 배포하기 (Vercel, 무료)

1. https://vercel.com 에서 GitHub 계정으로 가입
2. **Add New → Project** → 이 저장소(`Seouldaddys`) 선택
3. **Environment Variables** 에 위의 두 값(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) 입력
4. **Deploy** → 발급된 주소(예: `seouldaddys.vercel.app`)를 3명이 함께 사용

> ⚠️ 이 앱은 별도 로그인 없이 주소를 아는 사람은 누구나 쓸 수 있는 팀 내부용입니다.
> 앱 주소를 팀 밖으로 공유하지 마세요.

## 기술 스택

- [Next.js 14](https://nextjs.org) + TypeScript + Tailwind CSS
- [Supabase](https://supabase.com) — 데이터베이스 + 실시간 동기화
