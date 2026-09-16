import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FurnitureScene } from '@/components/furniture-icons'
import { ProductCard } from '@/components/product-card'
import { createClient } from '@/lib/supabase/server'
import type { ProductCard as ProductCardType } from '@/lib/types'

export const metadata = { title: 'Любимое' }

/** Мебель, которую человек отметил сердечком. Живёт в аккаунте. */
export default async function FavoritesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth?role=buyer&next=/favorites')

  const { data } = await supabase
    .from('favorites')
    .select(
      `product_id, created_at,
       products (
         id, company_id, category_id, slug, title, description, type, price,
         price_from, currency, status, boosted_until, views_count, created_at,
         companies (id, name, slug, district, has_phone, work_type),
         product_images (id, product_id, url, sort_order),
         categories (id, name, slug)
       )`,
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const products = ((data ?? [])
    .map((row) => (row as unknown as { products: ProductCardType | null }).products)
    .filter(Boolean) as ProductCardType[]).filter((p) => p.status === 'active')

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="display mb-5 text-xl text-text">Любимое</h1>

      {products.length === 0 ? (
        <div className="rounded-3xl bg-paper p-10 text-center">
          <FurnitureScene className="mx-auto h-28 w-auto text-text-muted opacity-70" />
          <p className="mt-5 text-text-muted">
            Здесь будет мебель, которую вы отметили сердечком.
          </p>
          <Link
            href="/catalog"
            className="press mt-5 inline-block rounded-full bg-gold px-6 py-3 font-semibold text-white transition-colors hover:bg-gold-deep"
          >
            Смотреть каталог
          </Link>
        </div>
      ) : (
        <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} favorite />
          ))}
        </div>
      )}
    </div>
  )
}
