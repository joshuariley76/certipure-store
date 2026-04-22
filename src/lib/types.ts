export interface Product {
  id: string
  name: string
  slug: string
  description: string
  short_description: string
  price: number
  compare_at_price: number | null
  size: string
  unit: string
  sku: string
  stock_quantity: number
  is_active: boolean
  is_featured: boolean
  badge: string | null
  image_url: string | null
  category_id: string | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string
  sort_order: number
}

export interface COA {
  id: string
  product_id: string
  batch_number: string
  purity_percent: number
  net_content_mg: number
  endotoxins_pass: boolean
  test_date: string
  vials_tested: number
  lab_name: string
  coa_pdf_url: string | null
  product?: Product
}

export interface CartItem {
  id: string
  customer_id: string
  product_id: string
  quantity: number
  product?: Product
}

export interface Order {
  id: string
  order_number: string
  status: string
  subtotal: number
  shipping_cost: number
  tax: number
  total: number
  payment_method: string
  payment_status: string
  created_at: string
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  product_size: string
  quantity: number
  unit_price: number
  total_price: number
}

export interface Customer {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  rewards_points: number
  total_spent: number
  order_count: number
}

export interface Address {
  id: string
  customer_id: string
  label: string
  first_name: string
  last_name: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  zip_code: string
  country: string
  is_default: boolean
}