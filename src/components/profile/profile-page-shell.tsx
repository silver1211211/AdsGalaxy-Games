import Link from "next/link";
import { ArrowLeft } from "lucide-react";
export function ProfilePageShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <main className="mx-auto max-w-2xl"><Link href="/profile" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-teal-700"><ArrowLeft size={19}/>Profile</Link><h1 className="text-3xl font-black">{title}</h1><p className="mt-2 text-sm leading-6 text-warm-600">{description}</p><div className="mt-6">{children}</div></main>;
}
