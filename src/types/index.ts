export type PaymentMethod = 'dinheiro' | 'pix' | 'debito' | 'credito';

export interface Product {
  id: string;
  name: string;
  defaultPrice: number; // in cents
  active: boolean;
}

export interface Transaction {
  id: string;
  date: string; // ISO string or YYYY-MM-DD
  type: 'venda' | 'retirada';
  description: string;
  quantity: number;
  unitPrice: number; // in cents
  payments: {
    dinheiro: number; // in cents
    pix: number;
    debito: number;
    credito: number;
  };
  total: number; // in cents
  notes?: string;
}

export type DateFilterType = 
  | 'hoje' 
  | 'ontem' 
  | '7dias' 
  | '30dias' 
  | 'esteMes' 
  | 'mesAnterior' 
  | 'tudo' 
  | 'personalizado';

export interface DateRange {
  start: Date;
  end: Date;
}
