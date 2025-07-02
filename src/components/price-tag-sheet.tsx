
'use client';

import React from 'react';
import type { Product } from '@/lib/types';
import RoopkothaLogo from './icons/roopkotha-logo';

const PriceTag = ({ product }: { product: Product }) => (
  <div style={{
    border: '1px solid #ccc',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    textAlign: 'center',
    height: '100%',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
    overflow: 'hidden',
    backgroundColor: 'white',
  }}>
    <div style={{ transform: 'scale(0.7)', transformOrigin: 'top center', marginBottom: '-10px', height: '36px' }}>
      <RoopkothaLogo showTagline={false} width={150} height={36} />
    </div>
    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '5px 0', width: '100%' }}>
      <p style={{ fontSize: '11pt', fontWeight: '600', margin: 0, wordBreak: 'break-word' }}>
        {product.name}
      </p>
      <p style={{ fontSize: '7pt', color: '#555', margin: '4px 0', fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {product.id}
      </p>
    </div>
    <p style={{ fontSize: '16pt', fontWeight: 'bold', margin: 0 }}>
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
