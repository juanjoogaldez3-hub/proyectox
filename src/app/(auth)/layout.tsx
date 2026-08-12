import Link from "next/link";

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-tinta-50 px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2 font-semibold text-tinta-900">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-marca-600 text-sm font-bold text-white">
          CC
        </span>
        CRM Chapín
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
