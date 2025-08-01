'use client';

import React from 'react';

interface Invoice {
  _id?: string;
  invoiceNumber: string;
  orderId?: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  vatAmount: number;
  vatRate: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface InvoiceItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceViewerProps {
  invoice: Invoice;
  onClose: () => void;
}

const InvoiceViewer: React.FC<InvoiceViewerProps> = ({ invoice, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-slate-600';
      case 'sent': return 'text-blue-600';
      case 'paid': return 'text-green-600';
      case 'overdue': return 'text-red-600';
      case 'cancelled': return 'text-gray-600';
      default: return 'text-slate-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-4xl max-h-[95vh] overflow-hidden rounded-2xl shadow-2xl">
        {/* Header Controls */}
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center print:hidden">
          <h3 className="text-lg font-semibold">Invoice Preview</h3>
          <div className="flex space-x-3">
            <button
              onClick={handlePrint}
              className="bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors"
            >
              🖨️ Print
            </button>
            <button
              onClick={onClose}
              className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Invoice Content - Exactly 1 Page */}
        <div className="bg-white p-4 w-full overflow-hidden text-black print:p-4 print:m-0 print:h-screen print:max-h-screen print:shadow-none" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', maxHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          {/* Company Header */}
          <div className="border-b-2 border-slate-800 pb-3 mb-3">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">TsvDistribution</h1>
                <p className="text-slate-600 text-sm">Inventory Management System</p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold text-slate-800 mb-1">INVOICE</h2>
                <div className="text-xs">
                  <p><span className="font-semibold">Invoice #:</span> {invoice.invoiceNumber}</p>
                  <p><span className="font-semibold">Issue Date:</span> {formatDate(invoice.issueDate)}</p>
                  <p><span className="font-semibold">Due Date:</span> {formatDate(invoice.dueDate)}</p>
                  <p className={`font-semibold mt-1 ${getStatusColor(invoice.status)}`}>
                    Status: {invoice.status.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800 mb-2">Bill To:</h3>
            <div className="text-xs">
              <p className="font-semibold text-sm">{invoice.customerName}</p>
              {invoice.customerEmail && <p className="text-slate-600">{invoice.customerEmail}</p>}
              {invoice.customerAddress && (
                <div className="mt-1 text-slate-700 whitespace-pre-line">
                  {invoice.customerAddress}
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-4 flex-1">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300">
                  <th className="text-left p-2 font-semibold text-slate-800">Description</th>
                  <th className="text-left p-2 font-semibold text-slate-800">SKU</th>
                  <th className="text-center p-2 font-semibold text-slate-800">Qty</th>
                  <th className="text-right p-2 font-semibold text-slate-800">Unit Price</th>
                  <th className="text-right p-2 font-semibold text-slate-800">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} className="border-b border-slate-200">
                    <td className="p-2 text-slate-800">{item.productName}</td>
                    <td className="p-2 text-slate-600 font-mono">{item.sku}</td>
                    <td className="p-2 text-center text-slate-800">{item.quantity}</td>
                    <td className="p-2 text-right text-slate-800">£{item.unitPrice.toFixed(2)}</td>
                    <td className="p-2 text-right font-semibold text-slate-800">£{item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-3">
            <div className="w-64">
              <div className="bg-slate-50 border border-slate-200 rounded p-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-700">
                    <span>Subtotal:</span>
                    <span>£{invoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>VAT ({invoice.vatRate}%):</span>
                    <span>£{invoice.vatAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-300 pt-1 mt-1">
                    <div className="flex justify-between text-sm font-bold text-slate-800">
                      <span>Total:</span>
                      <span>£{invoice.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mb-3">
              <h3 className="text-sm font-bold text-slate-800 mb-1">Notes:</h3>
              <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-700">
                {invoice.notes}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-slate-300 pt-2 mt-auto">
            <div className="text-center text-xs text-slate-500">
              <p>Thank you for your business!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceViewer;
