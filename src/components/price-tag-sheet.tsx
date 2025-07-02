
'use client';

import React from 'react';
import type { Product } from '@/lib/types';
import RoopkothaLogo from './icons/roopkotha-logo';
import { QRCodeCanvas } from 'qrcode.react';

const PriceTag = ({ product }: { product: Product }) => (
  <div style={{
    border: '1px solid #ccc',
    padding: '8px',
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
  }}>
    <div style={{ transform: 'scale(0.75)', transformOrigin: 'top center', marginBottom: '2px' }}>
      <RoopkothaLogo showTagline={true} width={150} height={36} />
    </div>

    <div style={{ margin: '4px 0' }}>
      <QRCodeCanvas
        value={product.barcode}
        size={40}
        bgColor={"#ffffff"}
        fgColor={"#000000"}
        level={"L"}
        includeMargin={false}
      />
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2px 0', width: '100%' }}>
      <p style={{ fontSize: '10pt', fontWeight: '600', margin: '0', wordBreak: 'break-word' }}>
        {product.name}
      </p>
      {product.description && (
        <p style={{ fontSize: '7pt', color: '#555', margin: '2px 0', wordBreak: 'break-word', fontStyle: 'italic' }}>
          {product.description}
        </p>
      )}
      <p style={{ fontSize: '7pt', color: '#333', marginTop: '4px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {product.barcode}
      </p>
    </div>
    <p style={{ fontSize: '14pt', fontWeight: 'bold', marginTop: 'auto', paddingTop: '4px' }}>
      ₹{product.price.toFixed(2)}
    </p>
  </div>
);


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
