/**
 * PDF Generator for TsvDistribution
 * 
 * This module provides functionality to generate branded PDF invoices
 * using jsPDF and html2canvas
 */

import { Invoice } from '@/types/database';
import { format } from 'date-fns';

// This is a client-side only module
// We'll use dynamic imports to avoid SSR issues
// The actual implementation will be in the client components

// Helper function to format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(amount);
}

// Helper function to format date
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd/MM/yyyy');
}

// Generate HTML template for the invoice
export function generateInvoiceHTML(invoice: Invoice): string {
  const companyInfo = {
    name: 'TsvDistribution Ltd',
    address: '123 Tech Park, Innovation Way',
    city: 'London',
    postcode: 'EC1A 1BB',
    country: 'United Kingdom',
    phone: '+44 20 1234 5678',
    email: 'accounts@tsvdistribution.com',
    website: 'www.tsvdistribution.com',
    vatNumber: 'GB123456789'
  };

  // Format dates
  const invoiceDate = invoice.issueDate ? formatDate(invoice.issueDate) : formatDate(new Date());
  const createdDate = formatDate(invoiceDate);
  const dueDate = invoice.dueDate ? formatDate(invoice.dueDate) : formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  // Format customer address based on type
  const customerAddressHtml = typeof invoice.customerAddress === 'string' 
    ? `<div>${invoice.customerAddress}</div>`
    : `<div>${invoice.customerAddress.street}</div>
       <div>${invoice.customerAddress.city}, ${invoice.customerAddress.zipCode}</div>
       <div>${invoice.customerAddress.state}</div>
       <div>${invoice.customerAddress.country}</div>`;

  // Generate items HTML
  const itemsHTML = invoice.items.map(item => `
    <tr>
      <td>${item.productName}</td>
      <td>${item.sku}</td>
      <td>${item.quantity}</td>
      <td>${formatCurrency(item.price)}</td>
      <td>${formatCurrency(item.total)}</td>
    </tr>
  `).join('');

  // Generate full HTML
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 0;
          color: #333;
          background-color: #fff;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 30px;
          border: 1px solid #eee;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
          font-size: 14px;
          line-height: 24px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          border-bottom: 1px solid #eee;
          padding-bottom: 20px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #0066cc;
        }
        .company-details {
          text-align: right;
          font-size: 12px;
        }
        .invoice-details {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        .client-info {
          width: 50%;
        }
        .invoice-info {
          width: 50%;
          text-align: right;
        }
        .invoice-info h2 {
          color: #0066cc;
          font-size: 28px;
          margin: 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        table th, table td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        table th {
          background-color: #f8f8f8;
          font-weight: bold;
        }
        .totals {
          margin-top: 30px;
          text-align: right;
        }
        .totals div {
          margin-bottom: 5px;
        }
        .total {
          font-size: 18px;
          font-weight: bold;
          color: #0066cc;
        }
        .notes {
          margin-top: 40px;
          font-size: 12px;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #999;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="logo">
            TsvDistribution
          </div>
          <div class="company-details">
            <div>${companyInfo.name}</div>
            <div>${companyInfo.address}</div>
            <div>${companyInfo.city}, ${companyInfo.postcode}</div>
            <div>${companyInfo.country}</div>
            <div>Phone: ${companyInfo.phone}</div>
            <div>Email: ${companyInfo.email}</div>
            <div>VAT: ${companyInfo.vatNumber}</div>
          </div>
        </div>
        
        <div class="invoice-details">
          <div class="client-info">
            <div><strong>Bill To:</strong></div>
            <div>${invoice.customerName}</div>
            ${customerAddressHtml}
          </div>
          
          <div class="invoice-info">
            <h2>INVOICE</h2>
            <div><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</div>
            <div><strong>Invoice Date:</strong> ${createdDate}</div>
            <div><strong>Due Date:</strong> ${dueDate}</div>
            <div><strong>Status:</strong> ${invoice.status.toUpperCase()}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>SKU</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        
        <div class="totals">
          <div><strong>Subtotal:</strong> ${formatCurrency(invoice.subtotal || 0)}</div>
          <div><strong>VAT (20%):</strong> ${formatCurrency(invoice.tax || 0)}</div>
          <div class="total"><strong>Total:</strong> ${formatCurrency(invoice.total || 0)}</div>
        </div>
        
        <div class="notes">
          <strong>Payment Terms:</strong> Payment due within 30 days of invoice date.
          <br>
          <strong>Payment Details:</strong> Please make payment to TsvDistribution Ltd, Account: 12345678, Sort Code: 12-34-56
        </div>
        
        <div class="footer">
          Thank you for your business! | www.tsvdistribution.com
        </div>
      </div>
    </body>
    </html>
  `;
}
