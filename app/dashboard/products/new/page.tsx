import { redirect } from 'next/navigation'
import { getSellerContext } from '@/lib/session'
import type { Category } from '@/lib/types'
import { ProductForm } from '../product-form'

export const metadata = { title: 'Новая мебель' }

export default async function NewProductPage() {
  const { supabase, company } = await getSellerContext()
  if (!company) redirect('/dashboard/company')

  const { data } = await supabase
    .from('categories')
    .select('id, slug, name, name_uz, vertical, sort_order')
    .eq('vertical', 'furniture')
    .order('sort_order')

  return (
    <div>
      <h2 className="display gold-rule mb-7 text-xl">Новая мебель</h2>
      <ProductForm categories={(data ?? []) as Category[]} />
    </div>
  )
}
