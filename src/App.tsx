/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  PlusCircle, 
  MinusCircle, 
  Calendar, 
  Search, 
  Download, 
  Upload, 
  Settings, 
  Trash2, 
  Edit2, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  CreditCard,
  Wallet,
  Smartphone,
  DollarSign,
  ArrowDownCircle,
  Package,
  Check,
  X
} from 'lucide-react';
import { 
  format, 
  addDays, 
  subDays, 
  startOfDay, 
  endOfDay, 
  isWithinInterval, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  subMonths,
  isSameDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBazarData } from './hooks/useBazarData';
import { cn, formatCurrency, parseBRLToCents } from './lib/utils';
import { DateFilterType, Transaction, Product, DateRange } from './types';

export default function App() {
  const { 
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
  } = useBazarData();

  // State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateFilter, setDateFilter] = useState<DateFilterType>('hoje');
  const [customRange, setCustomRange] = useState<DateRange>({
    start: startOfDay(new Date()),
    end: endOfDay(new Date())
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Computed Date Range
  const activeRange = useMemo((): DateRange => {
    const today = new Date();
    switch (dateFilter) {
      case 'hoje':
        return { start: startOfDay(today), end: endOfDay(today) };
      case 'ontem':
        const yesterday = subDays(today, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case '7dias':
        return { start: startOfDay(subDays(today, 6)), end: endOfDay(today) };
      case '30dias':
        return { start: startOfDay(subDays(today, 29)), end: endOfDay(today) };
      case 'esteMes':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case 'mesAnterior':
        const prevMonth = subMonths(today, 1);
        return { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) };
      case 'tudo':
        return { start: new Date(0), end: new Date(2100, 0, 1) };
      case 'personalizado':
        return customRange;
      default:
        return { start: startOfDay(today), end: endOfDay(today) };
    }
  }, [dateFilter, customRange]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = parseISO(t.date);
      const matchesDate = isWithinInterval(tDate, activeRange);
      const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (t.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDate && matchesSearch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, activeRange, searchQuery]);

  // Totals
  const totals = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (t.type === 'venda') {
        acc.dinheiro += t.payments.dinheiro;
        acc.pix += t.payments.pix;
        acc.debito += t.payments.debito;
        acc.credito += t.payments.credito;
        acc.vendas += t.total;
      } else {
        acc.retiradas += t.total;
      }
      return acc;
    }, { dinheiro: 0, pix: 0, debito: 0, credito: 0, vendas: 0, retiradas: 0 });
  }, [filteredTransactions]);

  const saldo = totals.vendas - totals.retiradas;

  // Handlers
  const handleExportCSV = () => {
    const headers = ['Data', 'Tipo', 'Mercadoria', 'Qtd', 'Unitário', 'Dinheiro', 'Pix', 'Débito', 'Crédito', 'Total', 'Notas'];
    const rows = filteredTransactions.map(t => [
      format(parseISO(t.date), 'dd/MM/yyyy HH:mm'),
      t.type === 'venda' ? 'Venda' : 'Retirada',
      t.description,
      t.quantity,
      (t.unitPrice / 100).toFixed(2),
      (t.payments.dinheiro / 100).toFixed(2),
      (t.payments.pix / 100).toFixed(2),
      (t.payments.debito / 100).toFixed(2),
      (t.payments.credito / 100).toFixed(2),
      (t.total / 100).toFixed(2),
      t.notes || ''
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vendas_bazar_${format(activeRange.start, 'yyyyMMdd')}_${format(activeRange.end, 'yyyyMMdd')}.csv`);
    link.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.transactions && data.products) {
            importBackup(data);
          } else {
            alert('Arquivo inválido.');
          }
        } catch (error) {
          alert('Erro ao ler arquivo.');
        }
      };
      reader.readAsText(file);
    }
  };

  if (!isLoaded) return <div className="flex h-screen items-center justify-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans text-slate-900">
      {/* Dashboard Headline Section */}
      <section className="bg-white border-b border-slate-200 px-4 pt-6 pb-4 shadow-sm md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg">
                <Package size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-800">Vendas Diárias — Bazar</h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dashboard de Controle</p>
              </div>
            </div>

            {/* Main Period Filters - Headline */}
            <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1.5">
              {[
                { id: 'hoje', label: 'Hoje' },
                { id: '7dias', label: 'Últimos 7 dias' },
                { id: 'esteMes', label: 'Este Mês' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setDateFilter(filter.id as DateFilterType)}
                  className={cn(
                    "rounded-lg px-4 py-2 text-xs font-black uppercase transition-all duration-200",
                    dateFilter === filter.id 
                      ? "bg-white text-indigo-600 shadow-md scale-105" 
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  )}
                >
                  {filter.label}
                </button>
              ))}
              <button
                onClick={() => setDateFilter('personalizado')}
                className={cn(
                  "rounded-lg px-4 py-2 text-xs font-black uppercase transition-all duration-200",
                  dateFilter === 'personalizado' 
                    ? "bg-white text-indigo-600 shadow-md scale-105" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                )}
              >
                Personalizado
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsProductModalOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95"
                title="Produtos e Configurações"
              >
                <Settings size={20} />
              </button>
              <div className="flex gap-1.5">
                <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition" title="Importar Backup">
                  <Upload size={18} />
                  <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                </label>
                <button 
                  onClick={exportBackup}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition"
                  title="Exportar Backup"
                >
                  <Download size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Cards Dashboard - Headline View */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SummaryCardSimple title="Dinheiro" value={totals.dinheiro} color="blue" icon={<DollarSign size={20} />} />
            <SummaryCardSimple title="Pix" value={totals.pix} color="orange" icon={<Smartphone size={20} />} />
            <SummaryCardSimple title="Cartão" value={totals.debito + totals.credito} color="green" icon={<CreditCard size={20} />} />
            <SummaryCardSimple title="Saldo Final" value={saldo} color={saldo >= 0 ? 'indigo' : 'red'} icon={<Wallet size={20} />} highlight />
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-slate-400">
            <div className="flex items-center gap-2">
              <Calendar size={14} />
              <span>{format(activeRange.start, "dd/MM/yyyy", { locale: ptBR })} {isSameDay(activeRange.start, activeRange.end) ? '' : ` até ${format(activeRange.end, "dd/MM/yyyy", { locale: ptBR })}`}</span>
            </div>
            {dateFilter === 'personalizado' && (
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={format(activeRange.start, 'yyyy-MM-dd')}
                  onChange={(e) => setCustomRange(prev => ({ ...prev, start: startOfDay(parseISO(e.target.value)) }))}
                  className="rounded border border-slate-200 px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span>até</span>
                <input 
                  type="date" 
                  value={format(activeRange.end, 'yyyy-MM-dd')}
                  onChange={(e) => setCustomRange(prev => ({ ...prev, end: endOfDay(parseISO(e.target.value)) }))}
                  className="rounded border border-slate-200 px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {/* Quick Entry Row */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Novo Lançamento</h2>
            <div className="flex gap-2">
               <button 
                onClick={() => setIsWithdrawalModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-black uppercase text-red-600 transition hover:bg-red-100"
              >
                <MinusCircle size={14} /> Registrar Retirada
              </button>
              <button 
                onClick={() => setIsSaleModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[10px] font-black uppercase text-indigo-600 transition hover:bg-indigo-100"
              >
                <PlusCircle size={14} /> Venda Detalhada
              </button>
            </div>
          </div>
          
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
             {/* Simple Product Selector Buttons */}
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="w-full text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Escolha um produto rápido:</span>
              {products.filter(p => p.active).map(p => (
                <button 
                  key={p.id}
                  onClick={() => {
                    const t: Transaction = {
                      id: Date.now().toString(),
                      date: new Date().toISOString(),
                      type: 'venda',
                      description: p.name,
                      quantity: 1,
                      unitPrice: p.defaultPrice,
                      payments: { dinheiro: p.defaultPrice, pix: 0, debito: 0, credito: 0 },
                      total: p.defaultPrice,
                    };
                    addTransaction(t);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95"
                >
                  <PlusCircle size={16} className="text-indigo-400" />
                  {p.name} ({formatCurrency(p.defaultPrice)})
                </button>
              ))}
            </div>

            <QuickEntryRow onAdd={addTransaction} />
          </div>
        </section>

        {/* History Table */}
        <section className="rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">Histórico de Lançamentos</h2>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Filtrar por nome ou descrição..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">
                <tr>
                  <th className="px-6 py-4">Data/Hora</th>
                  <th className="px-6 py-4">Lançamento</th>
                  <th className="px-6 py-4 text-center">Qtd</th>
                  <th className="px-6 py-4 text-right">Unitário</th>
                  <th className="px-6 py-4 text-right">Dinheiro</th>
                  <th className="px-6 py-4 text-right">Pix</th>
                  <th className="px-6 py-4 text-right">Cartão</th>
                  <th className="px-6 py-4 text-right font-black">Total Pago</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-medium">
                      Nenhum lançamento encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map(t => (
                    <tr key={t.id} className="group hover:bg-slate-50/50 transition duration-150">
                      <td className="whitespace-nowrap px-6 py-4 text-[11px] font-bold text-slate-400">
                        {format(parseISO(t.date), 'dd/MM HH:mm')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className={cn(
                            "font-bold text-sm",
                            t.type === 'retirada' ? 'text-red-600' : 'text-slate-900'
                          )}>
                            {t.description}
                          </span>
                          {t.notes && <span className="text-[10px] text-slate-400 font-medium">{t.notes}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-500">{t.type === 'venda' ? t.quantity : '-'}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-500">{t.type === 'venda' ? formatCurrency(t.unitPrice) : '-'}</td>
                      <td className="px-6 py-4 text-right font-bold text-blue-600">{t.payments.dinheiro > 0 ? formatCurrency(t.payments.dinheiro) : '-'}</td>
                      <td className="px-6 py-4 text-right font-bold text-orange-600">{t.payments.pix > 0 ? formatCurrency(t.payments.pix) : '-'}</td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600">{(t.payments.debito + t.payments.credito) > 0 ? formatCurrency(t.payments.debito + t.payments.credito) : '-'}</td>
                      <td className={cn(
                        "px-6 py-4 text-right font-black text-base",
                        t.type === 'retirada' ? 'text-red-600' : 'text-indigo-600'
                      )}>
                        {t.type === 'retirada' ? '-' : ''}{formatCurrency(t.total)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => { setEditingTransaction(t); t.type === 'venda' ? setIsSaleModalOpen(true) : setIsWithdrawalModalOpen(true); }} 
                            className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition active:scale-90"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              console.log("Deleting transaction:", t.id);
                              deleteTransaction(t.id);
                            }} 
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition active:scale-90"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Export Buttons - Footer */}
        <div className="mt-6 flex justify-end gap-2">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-black uppercase text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <Download size={14} /> Exportar para Excel (CSV)
          </button>
        </div>
      </main>

      <footer className="mt-8 border-t border-slate-200 pt-8 text-center">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Controle de Vendas — Bazar v1.0</p>
        <p className="mt-1 text-[10px] text-slate-300">Os dados são armazenados exclusivamente neste dispositivo.</p>
      </footer>

      {/* Modals */}
      {isSaleModalOpen && (
        <TransactionModal 
          type="venda"
          onClose={() => { setIsSaleModalOpen(false); setEditingTransaction(null); }}
          onSave={(t) => {
            if (editingTransaction) updateTransaction(editingTransaction.id, t);
            else addTransaction({ ...t, id: Date.now().toString() });
            setIsSaleModalOpen(false);
            setEditingTransaction(null);
          }}
          initialData={editingTransaction}
          products={products}
        />
      )}

      {isWithdrawalModalOpen && (
        <TransactionModal 
          type="retirada"
          onClose={() => { setIsWithdrawalModalOpen(false); setEditingTransaction(null); }}
          onSave={(t) => {
            if (editingTransaction) updateTransaction(editingTransaction.id, t);
            else addTransaction({ ...t, id: Date.now().toString() });
            setIsWithdrawalModalOpen(false);
            setEditingTransaction(null);
          }}
          initialData={editingTransaction}
          products={products}
        />
      )}

      {isProductModalOpen && (
        <ProductModal 
          products={products}
          onClose={() => setIsProductModalOpen(false)}
          onSaveProduct={(p) => {
            if (p.id) {
              updateProduct(p.id, p);
            } else {
              // For new products, we ensure it matches the Product interface
              const newProduct: Product = {
                id: Date.now().toString(),
                name: p.name || 'Novo Produto',
                defaultPrice: p.defaultPrice || 0,
                active: p.active ?? true
              };
              addProduct(newProduct);
            }
          }}
        />
      )}
    </div>
  );
}

// Subcomponents

function SummaryCardSimple({ title, value, icon, color, highlight = false }: { 
  title: string, value: number, icon: React.ReactNode, color: string, highlight?: boolean 
}) {
  const bgColors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    red: "bg-red-50 text-red-700 border-red-100",
  };

  return (
    <div className={cn(
      "flex flex-col rounded-2xl border p-4 shadow-sm transition-all duration-300 hover:shadow-md md:p-5",
      bgColors[color] || bgColors.indigo,
      highlight && "ring-2 ring-indigo-500 ring-offset-2 scale-[1.02]"
    )}>
      <div className="mb-2 flex items-center gap-2 opacity-70">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-wider md:text-xs">{title}</span>
      </div>
      <div className="text-lg font-black tracking-tight md:text-2xl">
        {formatCurrency(value)}
      </div>
    </div>
  );
}

function MiniStat({ title, value, color, highlight = false }: { title: string, value: number, color: string, highlight?: boolean }) {
  const colors: Record<string, string> = {
    blue: "text-blue-600 bg-blue-50",
    orange: "text-orange-600 bg-orange-50",
    green: "text-emerald-600 bg-emerald-50",
    indigo: "text-indigo-600 bg-indigo-50",
    red: "text-red-600 bg-red-50",
  };

  return (
    <div className={cn(
      "rounded-2xl p-3 border border-slate-200 bg-white shadow-sm",
      highlight && "ring-2 ring-indigo-50"
    )}>
      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">{title}</p>
      <p className={cn("text-base font-black truncate", colors[color])}>{formatCurrency(value)}</p>
    </div>
  );
}

function QuickEntryRow({ onAdd }: { onAdd: (t: Transaction) => void }) {
  const [desc, setDesc] = useState('');
  const [val, setVal] = useState(0);
  const [method, setMethod] = useState<keyof Transaction['payments']>('dinheiro');

  const handleAdd = () => {
    if (!desc || val <= 0) return;
    const t: Transaction = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type: 'venda',
      description: desc,
      quantity: 1,
      unitPrice: val,
      payments: { dinheiro: 0, pix: 0, debito: 0, credito: 0 },
      total: val,
    };
    t.payments[method] = val;
    onAdd(t);
    setDesc('');
    setVal(0);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
      <div className="sm:col-span-5">
        <input 
          placeholder="O que foi vendido?"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
        />
      </div>
      <div className="sm:col-span-2">
        <input 
          placeholder="Valor"
          value={val > 0 ? (val / 100).toFixed(2).replace('.', ',') : ''}
          onChange={e => setVal(parseBRLToCents(e.target.value))}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-600"
        />
      </div>
      <div className="sm:col-span-3">
        <select 
          value={method}
          onChange={e => setMethod(e.target.value as any)}
          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-600"
        >
          <option value="dinheiro">💵 Dinheiro</option>
          <option value="pix">📱 Pix</option>
          <option value="debito">💳 Cartão (Débito)</option>
          <option value="credito">💳 Cartão (Crédito)</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <button 
          onClick={handleAdd}
          disabled={!desc || val <= 0}
          className="w-full bg-indigo-600 text-white rounded-lg px-3 py-2 text-sm font-bold shadow-sm hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50"
        >
          Adicionar
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, color, highlight = false }: { 
  title: string, value: number, icon: React.ReactNode, color: string, highlight?: boolean 
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-600 shadow-blue-100 text-blue-50",
    orange: "bg-orange-600 shadow-orange-100 text-orange-50",
    yellow: "bg-yellow-500 shadow-yellow-100 text-yellow-50",
    green: "bg-emerald-600 shadow-emerald-100 text-emerald-50",
    red: "bg-red-600 shadow-red-100 text-red-50",
    indigo: "bg-indigo-600 shadow-indigo-100 text-indigo-50",
    slate: "bg-slate-700 shadow-slate-100 text-slate-50",
  };

  const bgColorMap: Record<string, string> = {
    blue: "text-blue-600",
    orange: "text-orange-600",
    yellow: "text-yellow-600",
    green: "text-emerald-600",
    red: "text-red-600",
    indigo: "text-indigo-600",
    slate: "text-slate-600",
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md",
      highlight && "ring-2 ring-indigo-100 bg-slate-50/30"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shadow-sm", colorMap[color] || colorMap.indigo)}>
          {icon}
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      </div>
      <p className={cn("mt-3 text-lg font-black md:text-xl", bgColorMap[color] || bgColorMap.indigo)}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function TransactionModal({ type, onClose, onSave, initialData, products }: {
  type: 'venda' | 'retirada',
  onClose: () => void,
  onSave: (t: Omit<Transaction, 'id'>) => void,
  initialData: Transaction | null,
  products: Product[]
}) {
  const [description, setDescription] = useState(initialData?.description || '');
  const [quantity, setQuantity] = useState(initialData?.quantity || 1);
  const [unitPrice, setUnitPrice] = useState(initialData?.unitPrice || 0);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [payments, setPayments] = useState(initialData?.payments || { dinheiro: 0, pix: 0, debito: 0, credito: 0 });
  const [paymentMode, setPaymentMode] = useState<'single' | 'split'>(
    initialData && Object.values(initialData.payments).filter(v => v > 0).length > 1 ? 'split' : 'single'
  );
  const [selectedPayment, setSelectedPayment] = useState<keyof Transaction['payments']>(
    (Object.entries(initialData?.payments || {}).find(([_, v]) => v > 0)?.[0] as any) || 'dinheiro'
  );
  const [date, setDate] = useState(initialData?.date || new Date().toISOString());

  const total = type === 'venda' ? quantity * unitPrice : unitPrice;

  useEffect(() => {
    if (paymentMode === 'single' && type === 'venda') {
      const newPayments = { dinheiro: 0, pix: 0, debito: 0, credito: 0 };
      newPayments[selectedPayment] = total;
      setPayments(newPayments);
    }
  }, [total, selectedPayment, paymentMode, type]);

  const paymentSum = payments.dinheiro + payments.pix + payments.debito + payments.credito;
  const isDiff = type === 'venda' && paymentSum !== total;

  const handleSave = () => {
    if (!description) return alert('Informe a mercadoria ou serviço.');
    if (total <= 0) return alert('O valor deve ser maior que zero.');
    if (isDiff) return alert('A soma dos pagamentos deve ser igual ao total da venda.');

    onSave({
      date,
      type,
      description,
      quantity,
      unitPrice,
      payments: type === 'venda' ? payments : { dinheiro: 0, pix: 0, debito: 0, credito: 0 },
      total,
      notes
    });
  };

  const activeProducts = products.filter(p => p.active);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl ring-1 ring-white/20">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <h2 className="text-xl font-bold text-slate-800">
            {initialData ? 'Editar' : 'Registrar'} {type === 'venda' ? 'Venda' : 'Retirada'}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Data</label>
                <input 
                  type="datetime-local"
                  value={date.slice(0, 16)}
                  onChange={(e) => setDate(new Date(e.target.value).toISOString())}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  {type === 'venda' ? 'Mercadoria / Serviço' : 'Motivo da Retirada'}
                </label>
                <input 
                  type="text"
                  placeholder="Ex: Impressão, Blusa, Café..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {type === 'venda' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Quantidade</label>
                    <input 
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Preço Unitário</label>
                    <input 
                      type="text"
                      value={(unitPrice / 100).toFixed(2).replace('.', ',')}
                      onChange={(e) => setUnitPrice(parseBRLToCents(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {type === 'retirada' && (
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Valor da Retirada</label>
                  <input 
                    type="text"
                    value={(unitPrice / 100).toFixed(2).replace('.', ',')}
                    onChange={(e) => setUnitPrice(parseBRLToCents(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-lg font-bold text-red-600 outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Observações (Opcional)</label>
                <textarea 
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              {type === 'venda' && (
                <>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Produtos Rápidos</label>
                  <div className="grid grid-cols-2 gap-2">
                    {activeProducts.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => { setDescription(p.name); setUnitPrice(p.defaultPrice); }}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:border-indigo-300 hover:bg-indigo-50"
                      >
                        <p className="font-semibold line-clamp-1">{p.name}</p>
                        <p className="text-xs text-slate-500">{formatCurrency(p.defaultPrice)}</p>
                      </button>
                    ))}
                  </div>

                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Valores Atalho</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 5, 10, 20, 50, 100].map(v => (
                      <button 
                        key={v}
                        onClick={() => setUnitPrice(v * 100)}
                        className="rounded-lg border bg-slate-50 px-2 py-1.5 text-xs font-bold hover:bg-slate-100"
                      >
                        R$ {v}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl bg-indigo-50 p-4 ring-1 ring-indigo-100">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-indigo-900 uppercase">Total da Venda</p>
                      <p className="text-xl font-black text-indigo-600">{formatCurrency(total)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Forma de Pagamento</label>
                      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                        <button 
                          onClick={() => setPaymentMode('single')}
                          className={cn("px-2 py-1 text-[10px] font-bold rounded", paymentMode === 'single' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500")}
                        >Única</button>
                        <button 
                          onClick={() => setPaymentMode('split')}
                          className={cn("px-2 py-1 text-[10px] font-bold rounded", paymentMode === 'split' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500")}
                        >Dividida</button>
                      </div>
                    </div>

                    {paymentMode === 'single' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <PaymentToggle active={selectedPayment === 'dinheiro'} onClick={() => setSelectedPayment('dinheiro')} label="Dinheiro" color="blue" />
                        <PaymentToggle active={selectedPayment === 'pix'} onClick={() => setSelectedPayment('pix')} label="Pix" color="orange" />
                        <PaymentToggle active={selectedPayment === 'debito'} onClick={() => setSelectedPayment('debito')} label="Débito" color="yellow" />
                        <PaymentToggle active={selectedPayment === 'credito'} onClick={() => setSelectedPayment('credito')} label="Crédito" color="green" />
                      </div>
                    ) : (
                      <div className="space-y-2 rounded-xl border border-slate-100 p-3">
                        <SplitInput label="Dinheiro" value={payments.dinheiro} onChange={(v) => setPayments(p => ({ ...p, dinheiro: v }))} color="blue" />
                        <SplitInput label="Pix" value={payments.pix} onChange={(v) => setPayments(p => ({ ...p, pix: v }))} color="orange" />
                        <SplitInput label="Débito" value={payments.debito} onChange={(v) => setPayments(p => ({ ...p, debito: v }))} color="yellow" />
                        <SplitInput label="Crédito" value={payments.credito} onChange={(v) => setPayments(p => ({ ...p, credito: v }))} color="green" />
                        
                        <div className={cn(
                          "mt-2 flex items-center justify-between rounded-lg px-3 py-2",
                          isDiff ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          <span className="text-xs font-bold uppercase">Soma: {formatCurrency(paymentSum)}</span>
                          {isDiff ? <X size={16} /> : <Check size={16} />}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 p-6">
          <button 
            onClick={handleSave}
            disabled={isDiff && type === 'venda'}
            className={cn(
              "w-full rounded-xl py-4 text-lg font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-50",
              type === 'venda' ? "bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700" : "bg-red-600 shadow-red-200 hover:bg-red-700"
            )}
          >
            {initialData ? 'Salvar Alterações' : `Confirmar ${type === 'venda' ? 'Venda' : 'Retirada'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentToggle({ active, onClick, label, color }: { active: boolean, onClick: () => void, label: string, color: string }) {
  const colors: any = {
    blue: active ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-600 hover:border-blue-300",
    orange: active ? "bg-orange-600 text-white border-orange-600" : "border-slate-200 text-slate-600 hover:border-orange-300",
    yellow: active ? "bg-yellow-500 text-white border-yellow-500" : "border-slate-200 text-slate-600 hover:border-yellow-300",
    green: active ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 text-slate-600 hover:border-emerald-300",
  };
  return (
    <button onClick={onClick} className={cn("border rounded-lg py-2 text-xs font-bold transition", colors[color])}>
      {label}
    </button>
  );
}

function SplitInput({ label, value, onChange, color }: { label: string, value: number, onChange: (v: number) => void, color: string }) {
  const dotColor: any = { blue: "bg-blue-500", orange: "bg-orange-500", yellow: "bg-yellow-500", green: "bg-emerald-500" };
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-24">
        <div className={cn("h-2 w-2 rounded-full", dotColor[color])} />
        <span className="text-xs font-medium text-slate-600">{label}</span>
      </div>
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
        <input 
          type="text"
          value={(value / 100).toFixed(2).replace('.', ',')}
          onChange={(e) => onChange(parseBRLToCents(e.target.value))}
          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}

function ProductModal({ products, onClose, onSaveProduct }: {
  products: Product[], onClose: () => void, onSaveProduct: (p: Partial<Product>) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);

  const handleSave = () => {
    if (!name) return;
    onSaveProduct({ id: editingId || undefined, name, defaultPrice: price, active: true });
    setName('');
    setPrice(0);
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-xl font-bold text-slate-800">Gerenciar Produtos</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>
        
        <div className="p-6">
          <div className="mb-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              {editingId ? 'Editar Produto' : 'Novo Produto'}
            </p>
            <div className="flex flex-col gap-3">
              <input 
                placeholder="Nome do produto"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex gap-2">
                <input 
                  placeholder="Preço padrão"
                  value={(price / 100).toFixed(2).replace('.', ',')}
                  onChange={(e) => setPrice(parseBRLToCents(e.target.value))}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                  onClick={handleSave}
                  className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
                >
                  {editingId ? 'Atualizar' : 'Adicionar'}
                </button>
                {editingId && (
                  <button onClick={() => { setEditingId(null); setName(''); setPrice(0); }} className="px-2 text-slate-400"><X size={20} /></button>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-[40vh] overflow-y-auto space-y-2">
            {products.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <p className="font-bold text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-500">{formatCurrency(p.defaultPrice)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onSaveProduct({ id: p.id, active: !p.active })}
                    className={cn("text-xs font-bold px-2 py-1 rounded", p.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}
                  >
                    {p.active ? 'Ativo' : 'Inativo'}
                  </button>
                  <button onClick={() => { setEditingId(p.id); setName(p.name); setPrice(p.defaultPrice); }} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
