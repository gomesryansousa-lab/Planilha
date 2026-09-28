import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(valueInCents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valueInCents / 100);
}

export function parseBRLToCents(value: string): number {
  const cleanValue = value.replace(/[^\d,]/g, '').replace(',', '.');
  const floatValue = parseFloat(cleanValue);
  return isNaN(floatValue) ? 0 : Math.round(floatValue * 100);
}
