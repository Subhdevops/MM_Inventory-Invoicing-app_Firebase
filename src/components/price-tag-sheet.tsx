
'use client';

import React from 'react';
import type { Product } from '@/lib/types';
import MinimalMischiefLogo from './icons/minimal-mischief-logo';
import { QRCodeCanvas } from 'qrcode.react';

const PriceTag = ({ product }: { product: Product }) => {
  const onSale = !!(product.salePercentage && product.salePercentage > 0);

  return (
    <div style={{
      border: '1px solid #ccc',
      padding: '4px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      height: '100%',
      width: '100%',
      boxSizing: 'border-box',
      fontFamily: 'Inter, sans-serif',
      overflow: 'hidden',
      backgroundColor: 'white',
      lineHeight: '1.2',
      position: 'relative',
    }}>
      <div style={{ transform: 'scale(0.75)', transformOrigin: 'top center', marginBottom: '-20' }}>
        <MinimalMischiefLogo showTagline={true} width={100} height={100} />
      </div>

      <div style={{ marginTop: '-20' }}>
        <QRCodeCanvas
          value={product.uniqueProductCode} // Use unique code for QR
          size={40}
          bgColor={"#ffffff"}
          fgColor={"#000000"}
          level={"H"}
          includeMargin={false}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0', width: '100%' }}>
        <p style={{ fontSize: '9pt', fontWeight: '600', margin: '0', wordBreak: 'break-word' }}>
          {product.name}
        </p>
        {product.description && (
          <p style={{ fontSize: '6pt', color: '#555', margin: '1px 0', wordBreak: 'break-word', fontStyle: 'italic' }}>
            {product.description}
          </p>
        )}
        <p style={{ fontSize: '6pt', color: '#333', marginTop: '1px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
          {product.uniqueProductCode}
        </p>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 'auto', paddingTop: '0', marginBottom: '20px' }}>
        <p style={{ fontSize: '12pt', fontWeight: 'bold', margin: 0 }}>
          ₹{product.price.toFixed(2)}
        </p>
      </div>
      
      {onSale && (
        <div style={{
          position: 'absolute',
          top: '0',
          right: '0',
          width: '75px',
          height: '75px',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: '18px',
            right: '-20px',
            width: '120px',
            padding: '4px 0',
            backgroundColor: '#d9534f',
            color: 'white',
            transform: 'rotate(45deg)',
            textAlign: 'center',
            fontSize: '9pt',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1.2,
          }}>
            {product.salePercentage}% OFF
          </div>
        </div>
      )}
    </div>
  );
};


export const PriceTagSheet = ({ products }: { products: Product[] }) => {
    return (
        <div style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            width: '210mm',
            height: '297mm',
            backgroundColor: 'white',
            boxSizing: 'border-box',
        }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gridTemplateRows: 'repeat(4, 1fr)',
                gap: '5mm',
                padding: '10mm',
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
            }}>
                {products.map(p => <PriceTag key={p.id} product={p} />)}
                {/* Fill empty spots to maintain grid structure */}
                {Array.from({ length: 12 - products.length }).map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}
            </div>
        </div>
    );
};
