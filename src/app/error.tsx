"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center p-5">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto text-coral-500" size={38} />
        <h1 className="mt-5 text-2xl font-extrabold">Something went off course</h1>
        <p className="mt-2 text-sm text-warm-600">Please try loading this view again.</p>
        <button onClick={reset} className="mx-auto mt-6 flex min-h-12 items-center gap-2 rounded-2xl bg-ink px-5 text-sm font-extrabold text-white"><RotateCcw size={17} />Try again</button>
      </div>
    </main>
  );
}
