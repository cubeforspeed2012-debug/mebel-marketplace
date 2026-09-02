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
      className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-14"
      style={{
        background: 'radial-gradient(120% 90% at 50% 0%, #1a2135 0%, #0d1220 55%, #090d18 100%)',
      }}
    >
      <div className="animate-page w-full max-w-md">
        <div className="mb-7 text-center text-[0.6875rem] font-semibold uppercase tracking-[0.35em] text-[#8b93a7]">
          Mebel · Ташкент
        </div>

        <CodeForm role={role} />
      </div>
    </div>
  )
}
