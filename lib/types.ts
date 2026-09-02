import type { ProductType, WorkType } from './constants'
import type { OrderSource, OrderStatus } from './orders'

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
  telegram_chat_id: string | null
  moderation_note: string | null
  boosted_until: string | null
  views_count: number
  created_at: string
}

/** Клиент мебельщика — его собственная база, другим не видна. */
export type Client = {
  id: number
  company_id: number
  full_name: string
  phone: string | null
  source: string | null
  notes: string | null
  created_at: string
}

/** Заказ = карточка в воронке CRM. Рождается из заявки с сайта или заводится вручную. */
export type Order = {
  id: number
  client_id: number
  company_id: number
  product_id: number | null
  type: 'ready_made' | 'custom'
  status: OrderStatus
  title: string | null
  comment: string | null
  source: OrderSource | string
  total_price: number | null
  prepayment_amount: number | null
  measurement_visit_date: string | null
  created_at: string
  updated_at: string
}

/** Заказ вместе с клиентом — то, что видно в списке заявок. */
export type OrderWithClient = Order & {
  clients: Pick<Client, 'id' | 'full_name' | 'phone'> | null
  products: Pick<Product, 'id' | 'title'> | null
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
