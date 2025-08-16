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
  // Generate professional HTML for bulk barcode printing with enhanced layout
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>TsvStock - Professional Barcode Sheet</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
      <style>
        * { box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          margin: 0; 
          padding: 15px; 
          background: white;
          color: #000;
        }
        .header {
          text-align: center;
          margin-bottom: 25px;
          border-bottom: 2px solid #333;
          padding-bottom: 15px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
        }
        .print-info {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }
        .barcode-grid { 
          display: grid; 
          grid-template-columns: repeat(3, 1fr); 
          gap: 15px;
          margin-bottom: 20px;
        }
        .barcode-card { 
          border: 2px solid #000; 
          padding: 12px;
          text-align: center; 
          page-break-inside: avoid;
          background: white;
          border-radius: 6px;
          min-height: 180px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .product-header {
          border-bottom: 1px solid #ccc;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }
        .product-name { 
          font-size: 13px; 
          margin-bottom: 3px; 
          font-weight: bold;
          line-height: 1.2;
        }
        .product-sku { 
          font-size: 11px; 
          color: #666; 
          font-family: 'Courier New', monospace;
          background: #f5f5f5;
          padding: 2px 6px;
          border-radius: 3px;
          display: inline-block;
        }
        .barcode-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 8px 0;
        }
        .barcode-svg {
          max-width: 100%;
          height: 45px;
          margin-bottom: 5px;
        }
        .barcode-number { 
          font-family: 'Courier New', monospace; 
          font-size: 10px; 
          font-weight: bold; 
          margin: 3px 0;
          letter-spacing: 0.5px;
          color: #333;
        }
        .qr-section {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px dashed #ccc;
        }
        .qr-code {
          width: 45px;
          height: 45px;
          margin: 0 auto;
          display: block;
        }
        .qr-label {
          font-size: 8px;
          color: #666;
          margin-top: 2px;
        }
        @media print {
          body { 
            margin: 0; 
            padding: 10px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .barcode-card { 
            border: 2px solid #000 !important;
            background: white !important;
          }
          .no-print { display: none !important; }
          @page { 
            margin: 0.4in;
            size: A4;
          }
        }
        .footer {
          text-align: center;
          font-size: 10px;
          color: #999;
          margin-top: 20px;
          border-top: 1px solid #ccc;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>TsvStock - Professional Barcode Sheet</h1>
        <div class="print-info">Generated: ${new Date().toLocaleDateString()} | Products: ${products.length}</div>
      </div>
      
      <div class="barcode-grid">
  `;
  
  products.forEach((product, index) => {
    const barcodeId = `barcode-${index}`;
    const qrCodeId = `qrcode-${index}`;
    
    html += `
      <div class="barcode-card">
        <div class="product-header">
          <div class="product-name">${product.name.length > 30 ? product.name.substring(0, 30) + '...' : product.name}</div>
          <div class="product-sku">SKU: ${product.sku}</div>
        </div>
        
        <div class="barcode-section">
          <svg id="${barcodeId}" class="barcode-svg"></svg>
          <div class="barcode-number">${formatBarcodeForDisplay(product.barcode)}</div>
        </div>
        
        <div class="qr-section">
          <canvas id="${qrCodeId}" class="qr-code"></canvas>
          <div class="qr-label">QR Code</div>
        </div>
      </div>
    `;
  });
  
  html += `
      </div>
      
      <div class="footer">
        TsvStock Inventory Management System | Barcode Sheet
      </div>
      
      <script>
        let barcodeGenerationComplete = false;
        
        function generateBarcodes() {
          const products = ${JSON.stringify(products)};
          let completedBarcodes = 0;
          let completedQRCodes = 0;
          
          products.forEach((product, index) => {
            // Generate barcode with better error handling
            try {
              if (typeof JsBarcode !== 'undefined' && document.getElementById(\`barcode-\${index}\`)) {
                JsBarcode(\`#barcode-\${index}\`, product.barcode, {
                  format: "CODE128",
                  width: 1.8,
                  height: 45,
                  displayValue: false,
                  margin: 0,
                  background: "#ffffff",
                  lineColor: "#000000"
                });
                completedBarcodes++;
              }
            } catch (error) {
              console.error('Error generating barcode for:', product.name, error);
              // Enhanced fallback
              const svg = document.getElementById(\`barcode-\${index}\`);
              if (svg) {
                svg.innerHTML = \`
                  <rect width="100%" height="100%" fill="white" stroke="black" stroke-width="1"/>
                  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
                        font-size="8" font-family="monospace">CODE128</text>
                \`;
              }
              completedBarcodes++;
            }
            
            // Generate QR code with better error handling
            try {
              if (typeof QRCode !== 'undefined' && document.getElementById(\`qrcode-\${index}\`)) {
                const qrData = \`{"name":"\${product.name}","sku":"\${product.sku}","barcode":"\${product.barcode}","id":"\${product.id}"}\`;
                
                QRCode.toCanvas(document.getElementById(\`qrcode-\${index}\`), qrData, {
                  width: 45,
                  height: 45,
                  margin: 1,
                  color: {
                    dark: '#000000',
                    light: '#ffffff'
                  }
                }, function(error) {
                  if (error) {
                    console.error('QR Code generation error:', error);
                    // QR fallback
                    const canvas = document.getElementById(\`qrcode-\${index}\`);
                    if (canvas) {
                      const ctx = canvas.getContext('2d');
                      ctx.fillStyle = '#f0f0f0';
                      ctx.fillRect(0, 0, 45, 45);
                      ctx.fillStyle = '#000';
                      ctx.font = '8px Arial';
                      ctx.textAlign = 'center';
                      ctx.fillText('QR', 22, 25);
                    }
                  }
                  completedQRCodes++;
                });
              } else {
                completedQRCodes++;
              }
            } catch (error) {
              console.error('Error generating QR code for:', product.name, error);
              completedQRCodes++;
            }
          });
          
          // Check completion and auto-print
          const checkCompletion = setInterval(() => {
            if (completedBarcodes === products.length && completedQRCodes === products.length) {
              clearInterval(checkCompletion);
              barcodeGenerationComplete = true;
              console.log('All barcodes and QR codes generated successfully');
              
              // Auto-print after a short delay
              setTimeout(() => {
                if (window.confirm('Barcodes generated! Print now?')) {
                  window.print();
                }
              }, 500);
            }
          }, 100);
        }
        
        // Initialize when page loads
        window.addEventListener('load', function() {
          // Wait for external libraries to load
          setTimeout(generateBarcodes, 200);
        });
        
        // Fallback if libraries don't load
        setTimeout(() => {
          if (!barcodeGenerationComplete) {
            console.warn('Barcode generation taking longer than expected');
            if (typeof JsBarcode === 'undefined') {
              console.error('JsBarcode library not loaded');
            }
            if (typeof QRCode === 'undefined') {
              console.error('QRCode library not loaded');
            }
          }
        }, 3000);
      </script>
    </body>
    </html>
  `;
  
  return html;
}
