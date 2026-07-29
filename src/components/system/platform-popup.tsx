"use client";

import Link from "next/link";
import { LoaderCircle, X } from "lucide-react";
import { useEffect, useRef } from "react";

export function PlatformPopup({
  title,
  message,
  primary,
  secondary,
  busy = false,
  dismissible = false,
  onClose,
}: {
  title: string;
  message: string;
  primary?: { label: string; href?: string; onClick?: () => void };
  secondary?: { label: string; href?: string; onClick?: () => void };
  busy?: boolean;
  dismissible?: boolean;
  onClose?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);
  const action = (item: NonNullable<typeof primary>, primaryAction: boolean) =>
    item.href ? (
      <Link href={item.href} className={primaryAction ? "game-primary" : "game-secondary"}>
        {item.label}
      </Link>
    ) : (
      <button type="button" onClick={item.onClick} className={primaryAction ? "game-primary" : "game-secondary"}>
        {item.label}
      </button>
    );
  return (
    <dialog
      ref={ref}
      aria-labelledby="platform-popup-title"
      aria-describedby="platform-popup-message"
      onCancel={(event) => {
        if (!dismissible) event.preventDefault();
        else onClose?.();
      }}
      className="m-auto max-h-[calc(100dvh-1rem)] w-[min(30rem,calc(100%-1rem))] overflow-y-auto rounded-3xl bg-white p-0 text-ink shadow-2xl backdrop:bg-slate-950/60"
    >
      <div className="p-6 sm:p-7">
        {dismissible && (
          <button type="button" aria-label="Close popup" onClick={onClose} className="game-icon-button ml-auto">
            <X size={18} />
          </button>
        )}
        <h2 id="platform-popup-title" className="text-2xl font-black">{title}</h2>
        <p id="platform-popup-message" className="mt-3 text-sm leading-6 text-warm-600">{message}</p>
        {busy && <LoaderCircle className="mx-auto mt-5 animate-spin text-teal-700" aria-label="Loading" />}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {primary && action(primary, true)}
          {secondary && action(secondary, false)}
        </div>
      </div>
    </dialog>
  );
}
