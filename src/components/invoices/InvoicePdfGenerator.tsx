'use client';

import React, { useRef, useState } from 'react';
import { Invoice } from '@/types/database';
import { generateInvoiceHTML } from '@/lib/pdf-generator';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// Dynamic imports to avoid SSR issues
import dynamic from 'next/dynamic';

// Types for the dynamically imported libraries
declare global {
  interface Window {
    html2canvas: typeof import('html2canvas').default;
    jsPDF: typeof import('jspdf');
  }
}

interface InvoicePdfGeneratorProps {
  invoice: Invoice;
}

const InvoicePdfGenerator: React.FC<InvoicePdfGeneratorProps> = ({ invoice }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Function to generate and download PDF
  const generatePDF = async () => {
    if (!invoiceRef.current) return;
    
    setIsGenerating(true);
    toast.loading('Generating PDF...');
    
    try {
      // Dynamically import the libraries
      const html2canvasModule = await import('html2canvas');
      const jsPDFModule = await import('jspdf');
      
      const html2canvas = html2canvasModule.default;
      const jsPDF = jsPDFModule.default;
      
      // Create a new jsPDF instance
      const pdf = new jsPDF('portrait', 'pt', 'a4');
      
      // Get the HTML element
      const element = invoiceRef.current;
      
      // Convert HTML to canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      // Get canvas dimensions
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 595.28; // A4 width in pts
      const pageHeight = 841.89; // A4 height in pts
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add new pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Save the PDF
      const fileName = `Invoice_${invoice.invoiceNumber}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      pdf.save(fileName);
      
      toast.dismiss();
      toast.success('PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.dismiss();
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate HTML for the invoice
  const invoiceHTML = generateInvoiceHTML(invoice);

  return (
    <div className="invoice-pdf-generator">
      <button
        onClick={generatePDF}
        disabled={isGenerating}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M13 8V2H7v6H2l8 8 8-8h-5zM0 18h20v2H0v-2z" />
            </svg>
            Download PDF
          </>
        )}
      </button>
      
      {/* Hidden invoice template for PDF generation */}
      <div className="hidden">
        <div ref={invoiceRef} dangerouslySetInnerHTML={{ __html: invoiceHTML }} />
      </div>
    </div>
  );
};

export default InvoicePdfGenerator;
