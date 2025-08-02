'use client';

import React from 'react';

const InvoicePrintStyles: React.FC = () => {
  return (
    <style jsx global>{`
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        
        @page {
          size: A4;
          margin: 0.5in;
        }
        
        body {
          margin: 0;
          padding: 0;
          background: white !important;
        }
        
        .no-print {
          display: none !important;
        }
        
        .print-only {
          display: block !important;
        }
        
        .invoice-container {
          width: 100% !important;
          max-width: none !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          background: white !important;
        }
        
        .invoice-content {
          page-break-inside: avoid;
          break-inside: avoid;
          width: 100% !important;
          height: auto !important;
          min-height: auto !important;
          max-height: none !important;
          overflow: visible !important;
          margin: 0 !important;
          padding: 1rem !important;
          background: white !important;
          color: black !important;
        }
        
        table {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .invoice-header {
          margin-bottom: 1rem;
        }
        
        .invoice-items {
          margin: 1rem 0;
        }
        
        .invoice-totals {
          margin-top: 1rem;
        }
        
        /* Ensure text is black */
        * {
          color: black !important;
        }
        
        /* Ensure borders show */
        .border,
        .border-b,
        .border-t,
        .border-l,
        .border-r,
        .border-slate-200,
        .border-slate-300,
        .border-slate-800 {
          border-color: #000 !important;
        }
        
        /* Ensure backgrounds show */
        .bg-slate-50,
        .bg-slate-100 {
          background-color: #f8f9fa !important;
        }
      }
    `}</style>
  );
};

export default InvoicePrintStyles;
