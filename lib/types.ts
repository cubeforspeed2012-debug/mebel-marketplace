import type { ProductType, WorkType } from './constants'

export type Category = {
  id: number
  slug: string | null
  name: string
  name_uz: string | null
  vertical: string
  sort_order: number
}

export type Company = {
  id: number
  owner_user_id: string
  slug: string | null
  name: string
  description: string | null
  address: string | null
  district: string | null
  phone_public: string | null
  email: string | null
  instagram: string | null
  telegram: string | null
  logo_url: string | null
  cover_url: string | null
  work_type: WorkType | null
  status: 'pending' | 'active' | 'blocked'
  phone_verified: boolean
  boosted_until: string | null
  views_count: number
  created_at: string
}

export type ProductImage = {
  id: number
  product_id: number
  url: string
  sort_order: number
}

export type Product = {
  id: number
  company_id: number
  category_id: number | null
  slug: string | null
  title: string
  description: string | null
  type: ProductType | null
  price: number | null
  price_from: boolean
  currency: string
  status: 'draft' | 'active' | 'hidden'
  boosted_until: string | null
  views_count: number
  created_at: string
}

/** Товар вместе с компанией и фото — то, что показывается в каталоге. */
export type ProductCard = Product & {
  companies: Pick<Company, 'id' | 'name' | 'slug' | 'district' | 'phone_public' | 'work_type'> | null
  product_images: ProductImage[]
  categories: Pick<Category, 'id' | 'name' | 'slug'> | null
}
