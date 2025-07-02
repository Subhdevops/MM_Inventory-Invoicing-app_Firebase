
import type { Product } from '@/lib/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { PriceTagSheet } from '@/components/price-tag-sheet';
import type { useToast } from "@/hooks/use-toast";

export const generatePriceTagsPDF = async (products: Product[], toast: ReturnType<typeof useToast>['toast']) => {
    if (products.length === 0) {
        toast({
            title: "No Products Selected",
            description: "Please select at least one product to generate price tags.",
            variant: "destructive",
        });
        return;
    }

    const toastId = 'pdf-generation-toast';
    toast({
        id: toastId,
        title: "Generating PDF...",
        description: "Please wait while the price tags are being created.",
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const tagsPerPage = 12;
    const numPages = Math.ceil(products.length / tagsPerPage);

    // This container will be used to mount the React component off-screen
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
        for (let i = 0; i < numPages; i++) {
            const pageProducts = products.slice(i * tagsPerPage, (i + 1) * tagsPerPage);
            
            // Render the sheet component
            root.render(React.createElement(PriceTagSheet, { products: pageProducts }));

            // Give React a moment to render to the DOM
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const sheetElement = container.firstChild as HTMLElement;
            if (!sheetElement) {
                throw new Error("Price tag sheet element not found in DOM.");
            }

            const canvas = await html2canvas(sheetElement, {
                scale: 3, // Higher scale for better quality
                useCORS: true,
                backgroundColor: '#ffffff',
            });

            const imgData = canvas.toDataURL('image/png');

            if (i > 0) {
                pdf.addPage();
            }
            // Add the image to the PDF, fitting it to the page
            pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
        }

        // Once all pages are added, save the PDF
        pdf.save('price-tags.pdf');
        toast({
            id: toastId,
            title: "PDF Generated",
            description: "Your price tags have been downloaded.",
        });
    } catch (error) {
        console.error("Error generating price tag PDF:", error);
        toast({
            id: toastId,
            title: "Error",
            description: "Failed to generate price tag PDF.",
            variant: "destructive",
        });
    } finally {
        // Clean up the temporary DOM element
        root.unmount();
        document.body.removeChild(container);
    }
};
