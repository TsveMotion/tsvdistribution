/**
 * Barcode generation utility for products
 */

export function generateBarcode(): string {
  // Generate a valid EAN-13 barcode (13 digits)
  // First 3 digits: company prefix (using 123 as example)
  // Next 4 digits: product category/group
  // Next 5 digits: product identifier
  // Last digit: check digit
  
  const companyPrefix = '123';
  const productGroup = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const productId = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  
  const baseCode = companyPrefix + productGroup + productId;
  const checkDigit = calculateEAN13CheckDigit(baseCode);
  
  return baseCode + checkDigit;
}

function calculateEAN13CheckDigit(baseCode: string): string {
  let sum = 0;
  
  for (let i = 0; i < baseCode.length; i++) {
    const digit = parseInt(baseCode[i]);
    if (i % 2 === 0) {
      sum += digit;
    } else {
      sum += digit * 3;
    }
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}

export function generateBarcodeForSKU(sku: string): string {
  // Generate a barcode based on SKU for consistency
  let hash = 0;
  for (let i = 0; i < sku.length; i++) {
    const char = sku.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive number and create barcode
  const positiveHash = Math.abs(hash);
  const baseCode = '123' + positiveHash.toString().padEnd(9, '0').substring(0, 9);
  const checkDigit = calculateEAN13CheckDigit(baseCode);
  
  return baseCode + checkDigit;
}

export function formatBarcodeForDisplay(barcode: string): string {
  if (barcode.length === 13) {
    // Format EAN-13: 1 23 456789 012345 6
    return `${barcode[0]} ${barcode.substring(1, 3)} ${barcode.substring(3, 9)} ${barcode.substring(9, 12)} ${barcode[12]}`;
  }
  return barcode;
}

export function generateBulkBarcodes(products: Array<{id: string, name: string, sku: string, barcode: string}>): string {
  // Generate HTML for bulk barcode printing
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bulk Barcode Print - TsvDistribution</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .barcode-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .barcode-item { 
          border: 1px solid #ccc; 
          padding: 15px; 
          text-align: center; 
          page-break-inside: avoid;
          background: white;
        }
        .barcode-number { 
          font-family: 'Courier New', monospace; 
          font-size: 18px; 
          font-weight: bold; 
          margin: 10px 0;
          letter-spacing: 2px;
        }
        .product-name { font-size: 14px; margin-bottom: 5px; font-weight: bold; }
        .product-sku { font-size: 12px; color: #666; margin-bottom: 10px; }
        .barcode-visual {
          height: 40px;
          background: linear-gradient(90deg, 
            black 2px, white 1px, black 1px, white 2px, black 3px, white 1px,
            black 1px, white 1px, black 2px, white 2px, black 1px, white 3px,
            black 2px, white 1px, black 1px, white 1px, black 2px, white 2px,
            black 3px, white 1px, black 1px, white 2px, black 1px, white 1px
          );
          background-size: 95px 100%;
          margin: 10px 0;
        }
        @media print {
          body { margin: 0; }
          .barcode-item { border: 2px solid #000; }
        }
        @page { margin: 0.5in; }
      </style>
    </head>
    <body>
      <h1 style="text-align: center; margin-bottom: 30px;">TsvDistribution - Barcode Print Sheet</h1>
      <div class="barcode-grid">
  `;
  
  products.forEach(product => {
    html += `
      <div class="barcode-item">
        <div class="product-name">${product.name}</div>
        <div class="product-sku">SKU: ${product.sku}</div>
        <div class="barcode-visual"></div>
        <div class="barcode-number">${formatBarcodeForDisplay(product.barcode)}</div>
      </div>
    `;
  });
  
  html += `
      </div>
    </body>
    </html>
  `;
  
  return html;
}
