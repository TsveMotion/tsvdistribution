import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'staff' | 'employee';
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  _id?: ObjectId;
  name: string;
  description: string;
  sku: string;
  category: string;
  price: number; // in GBP
  cost: number; // in GBP
  quantity: number;
  minStockLevel: number;
  locations: ProductLocation[];
  supplier: string;
  supplierLink?: string;
  barcode?: string;
  weight?: number; // in KG
  dimensions?: {
    length: number; // in CM
    width: number; // in CM
    height: number; // in CM
  };
  images?: string[];
  aiGeneratedDescription?: string;
  aiGeneratedTitle?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductLocation {
  locationId: ObjectId;
  quantity: number;
  lastUpdated: Date;
}

export interface Location {
  _id?: ObjectId;
  name: string;
  type: 'warehouse' | 'shelf' | 'bin' | 'zone';
  code: string;
  description?: string;
  capacity: number;
  parentLocationId?: ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  _id?: ObjectId;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  items: OrderItem[];
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  carrier?: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
}

export interface OrderItem {
  productId: ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
}

export interface StockMovement {
  _id?: ObjectId;
  productId: ObjectId;
  locationId: ObjectId;
  movementType: 'in' | 'out' | 'transfer' | 'adjustment';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  reference?: string; // Order number, transfer ID, etc.
  userId: ObjectId;
  createdAt: Date;
}

export interface Invoice {
  _id?: ObjectId;
  invoiceNumber: string;
  orderId: ObjectId;
  customerName: string;
  customerAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: Date;
  paidDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
}

export interface TrackingUpdate {
  _id?: ObjectId;
  orderId: ObjectId;
  trackingNumber: string;
  status: string;
  location: string;
  timestamp: Date;
  description: string;
  createdAt: Date;
}
