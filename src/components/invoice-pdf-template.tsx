
import React from 'react';
import type { Invoice } from '@/lib/types';
import RoopkothaLogo from './icons/roopkotha-logo';

// This component is designed to be rendered off-screen for PDF generation.
// It uses Tailwind classes which will be applied because it's part of the main document tree.
// The root div has a fixed width corresponding to an A4 paper size.
export const InvoicePDFTemplate = React.forwardRef<HTMLDivElement, { invoice: Invoice }>(({ invoice }, ref) => {
    
    const formatCurrency = (amount: number) => {
        // Use Intl.NumberFormat for robust currency formatting
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    return (
        <div ref={ref} style={{ width: '210mm', backgroundColor: 'white' }}>
            <div className="p-[15mm] font-sans text-xs text-gray-800">
                {/* Header */}
                <header className="flex justify-between items-start pb-3 border-b border-gray-200">
                    <div>
                        <RoopkothaLogo showTagline={true} width={200} height={48} />
                    </div>
                    <div className="text-right">
                        <h1 className="text-3xl font-bold text-primary mb-1">INVOICE</h1>
                        <p>Invoice #: {invoice.invoiceNumber}</p>
                        <p>Date: {new Date(invoice.date).toLocaleDateString()}</p>
                    </div>
                </header>

                {/* Billing Info */}
                <section className="flex justify-between mt-6">
                    <div className="leading-normal">
                        <h2 className="font-bold uppercase text-sm text-gray-500 mb-1">Bill To:</h2>
                        <p>{invoice.customerName}</p>
                        <p>{invoice.customerPhone}</p>
                    </div>
                    <div className="text-right leading-normal">
                        <h2 className="font-bold uppercase text-sm text-gray-500 mb-1">From:</h2>
                        <p className="font-bold text-primary">Roopkotha</p>
                        <p>Professor Colony, C/O, Deshbandhu Pal</p>
                        <p>Holding No :- 195/8, Ward no. 14</p>
                        <p>Bolpur, Birbhum, West Bengal - 731204</p>
                        <p>GSTIN: 19AANCR9537M1ZC</p>
                        <p>Phone: 9476468690</p>
                    </div>
                </section>

                {/* Items Table */}
                <section className="mt-6">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-primary text-primary-foreground">
                                <th className="px-2 py-1 text-left w-12 font-semibold">#</th>
                                <th className="px-2 py-1 text-left font-semibold">Product</th>
                                <th className="px-2 py-1 text-center w-20 font-semibold">Qty</th>
                                <th className="px-2 py-1 text-right w-32 font-semibold">Price</th>
                                <th className="px-2 py-1 text-right w-32 font-semibold">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item, index) => (
                                <tr key={item.id} className="border-b border-gray-100 last:border-b-0">
                                    <td className="px-2 py-1 align-top">{index + 1}</td>
                                    <td className="px-2 py-1 align-top">
                                        <p className="font-semibold">{item.name}</p>
                                        {item.description && <p className="text-gray-500 text-xs">{item.description}</p>}
                                    </td>
                                    <td className="px-2 py-1 text-center align-top">{item.quantity}</td>
                                    <td className="px-2 py-1 text-right align-top">{formatCurrency(item.price)}</td>
                                    <td className="px-2 py-1 text-right align-top">{formatCurrency(item.price * item.quantity)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                {/* Totals Section */}
                <section className="flex justify-end mt-6">
                    <div className="w-1/2">
                        <table className="w-full">
                            <tbody>
                                <tr className="border-t border-gray-200">
                                    <td className="px-2 py-1 text-right">Subtotal:</td>
                                    <td className="px-2 py-1 text-right w-40">{formatCurrency(invoice.subtotal)}</td>
                                </tr>
                                {invoice.discountAmount > 0 && (
                                <tr className="border-t border-gray-200">
                                    <td className="px-2 py-1 text-right">Discount ({invoice.discountPercentage}%):</td>
                                    <td className="px-2 py-1 text-right text-red-500 w-40">-{formatCurrency(invoice.discountAmount)}</td>
                                </tr>
                                )}
                                <tr className="border-t border-gray-200">
                                    <td className="px-2 py-1 text-right">GST (5%):</td>
                                    <td className="px-2 py-1 text-right w-40">{formatCurrency(invoice.gstAmount)}</td>
                                </tr>
                                <tr className="border-t-2 border-primary/50 bg-primary/10">
                                    <td className="px-2 py-1 text-right font-bold text-lg text-primary">Grand Total:</td>
                                    <td className="px-2 py-1 text-right font-bold text-lg text-primary w-40">{formatCurrency(invoice.grandTotal)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Footer */}
                <footer className="text-center mt-8 border-t border-gray-200 pt-4 relative">
                    <p className="italic mb-12">Thank you for shopping with us! Do visit again.</p>
                    <img src="/stamp.png" alt="Stamp" style={{ width: '150px', position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '35px', opacity: 0.8 }} />
                </footer>
            </div>
        </div>
    );
});
InvoicePDFTemplate.displayName = "InvoicePDFTemplate";
