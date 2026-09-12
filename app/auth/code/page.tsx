import { CodeForm } from './code-form'

export const metadata = { title: 'Вход по коду' }

export default async function CodePage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  const { role: roleParam } = await searchParams
  const role = roleParam === 'buyer' ? 'buyer' : 'seller'

  return (
    <div
      className="page-glow flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-14"
    >
      <div className="animate-page w-full max-w-md">
        <div className="mb-7 text-center text-[0.6875rem] font-semibold uppercase tracking-[0.35em] text-text-muted">
          Mebel · Ташкент
        </div>

        <CodeForm role={role} />
      </div>
    </div>
  )
}
