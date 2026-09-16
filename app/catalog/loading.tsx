/**
 * Пока каталог грузится — показываем каркас карточек вместо пустоты.
 * На небыстром интернете разница заметная: человек видит, что страница
 * работает, а не завис телефон.
 */
export default function CatalogLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="h-8 w-48 animate-pulse rounded-full bg-sand" />

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-[var(--radius)] border border-line bg-paper">
            <div className="aspect-4/3 animate-pulse bg-sand" />
            <div className="space-y-2 border-t border-line p-4">
              <div className="h-3 w-16 animate-pulse rounded-full bg-sand" />
              <div className="h-4 w-full animate-pulse rounded-full bg-sand" />
              <div className="h-5 w-24 animate-pulse rounded-full bg-sand" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
