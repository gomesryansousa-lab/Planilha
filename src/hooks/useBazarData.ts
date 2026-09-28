import { useState, useEffect, useCallback } from 'react';
import { Product, Transaction } from '../types';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

const STORAGE_KEY_TRANSACTIONS = 'bazar_transactions';
const STORAGE_KEY_PRODUCTS = 'bazar_products';

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Impressão', defaultPrice: 100, active: true },
];

export function useBazarData() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data
  useEffect(() => {
    const savedTransactions = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    const savedProducts = localStorage.getItem(STORAGE_KEY_PRODUCTS);

    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    }
    
    if (savedProducts) {
      setProducts(JSON.parse(savedProducts));
    } else {
      setProducts(INITIAL_PRODUCTS);
    }
    
    setIsLoaded(true);
  }, []);

  // Save data
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
    }
  }, [transactions, products, isLoaded]);

  const addTransaction = useCallback((transaction: Transaction) => {
    setTransactions(prev => [...prev, transaction]);
  }, []);

  const updateTransaction = useCallback((id: string, updated: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => (t.id === id ? { ...t, ...updated } as Transaction : t)));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const addProduct = useCallback((product: Product) => {
    setProducts(prev => [...prev, product]);
  }, []);

  const updateProduct = useCallback((id: string, updated: Partial<Product>) => {
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, ...updated } as Product : p)));
  }, []);

  const importBackup = useCallback((data: { transactions: Transaction[], products: Product[] }) => {
    if (window.confirm('Isso substituirá todos os seus dados atuais. Continuar?')) {
      setTransactions(data.transactions);
      setProducts(data.products);
    }
  }, []);

  const exportBackup = useCallback(() => {
    const data = JSON.stringify({ transactions, products }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_bazar_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  }, [transactions, products]);

  return {
    transactions,
    products,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addProduct,
    updateProduct,
    importBackup,
    exportBackup,
    isLoaded
  };
}
