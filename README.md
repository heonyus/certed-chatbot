# 채팅 시스템 구조 설명

## 채팅 API

채팅 API는 주로 `components/chat.tsx` 파일에서 구현되어 있습니다. 이 파일에서는 AI 상태 관리와 메시지 처리를 담당합니다.

주요 부분:
```typescript:components/chat.tsx
startLine: 23
endLine: 75
```

여기서 `useUIState`, `useAIState`, `useActions` 훅을 사용하여 채팅 상태를 관리하고 있습니다.

## 메시지 송신

사용자 메시지 전송은 주로 `components/chat-panel.tsx`에서 이루어집니다:

```typescript:components/chat-panel.tsx
startLine: 76
endLine: 93
```

`submitUserMessage` 함수를 사용하여 사용자 메시지를 전송하고 있습니다.

## 메시지 수신 및 표시

메시지 수신 및 표시는 `components/chat-list.tsx`에서 처리됩니다:

```typescript:components/chat-list.tsx
startLine: 11
endLine: 26
```

이 컴포넌트는 받은 메시지들을 순회하며 표시합니다.

## 메시지 렌더링

개별 메시지의 렌더링은 `components/chat-message.tsx`에서 이루어집니다:

```typescript:components/chat-message.tsx
startLine: 18
endLine: 80
```

이 컴포넌트는 메시지의 역할(사용자 또는 AI)에 따라 다르게 스타일링하여 표시합니다.

## 추가 기능

1. 코드 블록 처리: `components/ui/codeblock.tsx`
2. 메시지 액션 (복사 등): `components/chat-message-actions.tsx`
3. 채팅 공유: `components/chat-share-dialog.tsx`

## 주의사항

이 프로젝트는 Next.js와 React Server Components를 사용하고 있어, 일부 로직이 서버 사이드에서 실행될 수 있습니다. 클라이언트 사이드 로직과 서버 사이드 로직을 구분하여 이해하는 것이 중요합니다.