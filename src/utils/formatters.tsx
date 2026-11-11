import React from 'react';

export const N = (v: number, d = 0): string => {
  return Math.abs(Math.round(v)).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

export const Z = (v: number): boolean => Math.abs(v) < 1e-9;

export const Rt = (v: number): string => {
  if (Z(v)) return 'R$ 0';
  return (v < 0 ? '-' : '') + 'R$ ' + N(v);
};

export const RenderMoney: React.FC<{ value: number }> = ({ value }) => {
  if (Z(value)) {
    return (
      <div className="m">
        <span>R$</span>
        <span>-</span>
      </div>
    );
  }
  return (
    <div className="m">
      <span>{value < 0 ? '-' : ''}R$</span>
      <span>{N(value)}</span>
    </div>
  );
};

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function parseBRNumber(value: string | number): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value) return 0;
  const cleaned = value
    .trim()
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
