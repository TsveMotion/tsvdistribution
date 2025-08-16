'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Line } from '@react-pdf/renderer';
import { Invoice } from '@/types/database';

// Optionally register a font
// Font.register({ family: 'Inter', src: '/fonts/Inter-Regular.ttf' });

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  titleWrap: { flexDirection: 'column' },
  title: { fontSize: 20, fontWeight: 700 },
  subtitle: { color: '#475569', marginTop: 2 },
  section: { marginTop: 10, marginBottom: 10 },
  label: { color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 9 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  table: { marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 2 },
  th: { flex: 1, padding: 8, backgroundColor: '#f1f5f9', fontWeight: 700, borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  td: { flex: 1, padding: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0', borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  right: { textAlign: 'right' },
  totalsBox: { alignSelf: 'flex-end', width: '50%', padding: 8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 2 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalsDivider: { borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 6, paddingTop: 6 },
  small: { fontSize: 9, color: '#475569' },
  footer: { marginTop: 18, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, color: '#64748b' },
});

export const InvoicePdfDoc: React.FC<{ invoice: Invoice } & { title?: string }> = ({ invoice }) => {
  // Safe address handling (supports string, object, or missing)
  const addr = (() => {
    const ca = invoice?.customerAddress as any;
    if (!ca) return '';
    if (typeof ca === 'string') return ca;
    const parts = [ca.street, ca.city, ca.state, ca.zipCode, ca.country].filter(Boolean);
    return parts.join(', ');
  })();

  const formatGBP = (n: number | undefined) => `£${(n || 0).toFixed(2)}`;
  const issue = invoice.issueDate ? new Date(invoice.issueDate) : (invoice.createdAt ? new Date(invoice.createdAt) : undefined);
  const due = invoice.dueDate ? new Date(invoice.dueDate) : undefined;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Invoice</Text>
            <Text style={styles.subtitle}>#{invoice.invoiceNumber}</Text>
          </View>
          <View>
            {issue && <Text>Date: {issue.toISOString().substring(0,10)}</Text>}
            {due && <Text>Due: {due.toISOString().substring(0,10)}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Billed To</Text>
          <Text>{invoice.customerName}</Text>
          {invoice.customerEmail && <Text>{invoice.customerEmail}</Text>}
          {addr ? <Text>{addr}</Text> : <Text style={styles.small}>No address provided</Text>}
        </View>

        <View style={styles.section}>
          <View style={[styles.row, styles.table]}> 
            <Text style={styles.th}>Product</Text>
            <Text style={styles.th}>SKU</Text>
            <Text style={[styles.th, styles.right]}>Qty</Text>
            <Text style={[styles.th, styles.right]}>Price</Text>
            <Text style={[styles.th, styles.right]}>Total</Text>
          </View>
          {invoice.items.map((item, idx) => (
            <View key={idx} style={styles.row}>
              <Text style={styles.td}>{item.productName}</Text>
              <Text style={styles.td}>{item.sku}</Text>
              <Text style={[styles.td, styles.right]}>{item.quantity}</Text>
              <Text style={[styles.td, styles.right]}>{formatGBP(item.price)}</Text>
              <Text style={[styles.td, styles.right]}>{formatGBP(item.total)}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.section, styles.totalsBox]}>
          <View style={styles.totalsRow}><Text>Subtotal</Text><Text>{formatGBP(invoice.subtotal)}</Text></View>
          {typeof invoice.vatAmount === 'number' && (
            <View style={styles.totalsRow}><Text>VAT{invoice.vatRate ? ` (${invoice.vatRate}%)` : ''}</Text><Text>{formatGBP(invoice.vatAmount)}</Text></View>
          )}
          <View style={[styles.totalsRow, styles.totalsDivider]}>
            <Text style={{ fontWeight: 700 }}>Total</Text>
            <Text style={{ fontWeight: 700 }}>{formatGBP(invoice.total)}</Text>
          </View>
        </View>

        {invoice.notes && (
          <View style={styles.section}>
            <Text style={styles.label}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.small}>This is a computer-generated invoice. No signature required.</Text>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePdfDoc;
