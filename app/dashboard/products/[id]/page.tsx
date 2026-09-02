import { notFound, redirect } from 'next/navigation'
import { getSellerContext } from '@/lib/session'
import type { Category, Product, ProductImage } from '@/lib/types'
import { ProductForm } from '../product-form'

export const metadata = { title: 'Изменить мебель' }

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, company } = await getSellerContext()
  if (!company) redirect('/dashboard/company')
  if (!/^\d+$/.test(id)) notFound()

  const [productResult, categoriesResult] = await Promise.all([
    supabase
      .from('products')
      .select('*, product_images (id, product_id, url, sort_order)')
      .eq('id', Number(id))
      .eq('company_id', company.id)
      .maybeSingle(),
    supabase
      .from('categories')
      .select('id, slug, name, name_uz, vertical, sort_order')
      .eq('vertical', 'furniture')
      .order('sort_order'),
  ])

  if (!productResult.data) notFound()

  const product = productResult.data as unknown as Product & { product_images: ProductImage[] }

  return (
    <div>
      <h2 className="display gold-rule mb-7 text-xl">Изменить мебель</h2>
      <ProductForm
        product={product}
        images={product.product_images}
        categories={(categoriesResult.data ?? []) as Category[]}
      />
    </div>
  )
}
