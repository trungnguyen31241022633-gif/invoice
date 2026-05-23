export interface Product {
  code: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  note: string;
}

export type InvoiceStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export interface Invoice {
  id: string;
  customerName?: string;
  items: CartItem[];
  total: number;
  status: InvoiceStatus;
  createdAt: string;
}

export interface User {
  username: string;
}
