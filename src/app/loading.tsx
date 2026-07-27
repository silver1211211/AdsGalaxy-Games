export default function Loading() {
  return (
    <div className="mx-auto max-w-[1180px] animate-pulse px-4 py-6 sm:px-7">
      <div className="h-64 rounded-4xl bg-warm-100" />
      <div className="mt-10 h-8 w-52 rounded-xl bg-warm-100" />
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-[390px] rounded-4xl bg-warm-100" />)}
      </div>
    </div>
  );
}
