"use client";

// 예기치 못한 오류가 나도 하얀 화면 대신 안내를 보여주는 안전망
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 w-full max-w-md p-8 text-center">
        <div className="text-4xl mb-3">😵</div>
        <h1 className="text-xl font-bold mb-2">앗, 문제가 생겼어요</h1>
        <p className="text-sm text-slate-500 mb-4">
          아래 버튼으로 다시 시도해보세요. 계속 반복되면 이 화면을 캡처해서 관리자에게
          보내주세요.
        </p>
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-600 break-all mb-5 text-left">
          {error?.message || String(error)}
        </div>
        <button
          onClick={reset}
          className="rounded-lg bg-blue-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-blue-700"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
