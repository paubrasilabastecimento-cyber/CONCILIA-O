import React, { useState, useMemo } from 'react';
import { RawData, CalculatedProduct } from '../data/types';
import { Z, Rt, RenderMoney } from '../utils/formatters';

interface DifDiariaViewProps {
  data: RawData;
  calculatedMap: Record<number, CalculatedProduct>;
}

export const DifDiariaView: React.FC<DifDiariaViewProps> = ({
  data,
  calculatedMap,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'dif' | 'f' | 's'>('all');

  const { items, badCount, sal, sob, fal, it, codeCounts } = useMemo(() => {
    const list = data.dia.map((x, i) => {
      const r = calculatedMap[x[0]];
      const F = (r ? r.W : 0) * x[1];
      const H = r ? r.S : 0;
      const isMatchingOrder = x[0] === (data.res[i] || [])[0];
      return {
        c: x[0],
        d: r ? r.d : '',
        eq: x[1],
        F,
        gq: x[2],
        H,
        i: x[2] - x[1],
        j: H - F,
        f: isMatchingOrder ? 1 : 2,
      };
    });

    const counts: Record<number, number> = {};
    list.forEach((r) => {
      counts[r.c] = (counts[r.c] || 0) + 1;
    });

    const bad = list.filter((r) => r.f === 2).length;
    let sDiff = 0;
    let sobras = 0;
    let faltas = 0;
    let withDiffCount = 0;

    list.forEach((r) => {
      sDiff += r.j;
      if (r.j > 0) sobras += r.j;
      else if (r.j < 0) faltas += r.j;

      if (!Z(r.i) || !Z(r.j)) {
        withDiffCount++;
      }
    });

    return {
      items: list,
      badCount: bad,
      sal: sDiff,
      sob: sobras,
      fal: faltas,
      it: withDiffCount,
      codeCounts: counts,
    };
  }, [data.dia, data.res, calculatedMap]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((r) => {
      if (q && !(r.c + ' ' + r.d).toLowerCase().includes(q)) return false;
      if (filter === 'dif' && Z(r.i) && Z(r.j)) return false;
      if (filter === 'f' && !(r.j < 0 && !Z(r.j))) return false;
      if (filter === 's' && !(r.j > 0 && !Z(r.j))) return false;
      return true;
    });
  }, [items, query, filter]);

  return (
    <section>
      <div className="kpis">
        <div className="k">
          <small>SALDO (DIF DIÁRIA)</small>
          <span>{Rt(sal)}</span>
        </div>
        <div className="k g">
          <small>SOBRAS</small>
          <span>{Rt(sob)}</span>
        </div>
        <div className="k r">
          <small>FALTAS</small>
          <span>{Rt(fal)}</span>
        </div>
        <div className="k">
          <small>PRODUTOS COM DIFERENÇA</small>
          <span>{it} de {items.length}</span>
        </div>
      </div>

      <div className="tools">
        <span
          className="status-badge"
          style={{ color: badCount ? '#9C0006' : '#006100' }}
        >
          {badCount
            ? `Opa! Existem ${badCount} produtos que não estão iguais!`
            : 'Todos os Produtos estão OK!'}
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar código ou produto…"
          size={32}
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'dif' | 'f' | 's')}
        >
          <option value="all">Todos</option>
          <option value="dif">Só com diferença</option>
          <option value="f">Só faltas</option>
          <option value="s">Só sobras</option>
        </select>
        <span>{filtered.length} linhas</span>
      </div>

      <div className="wrap">
        <div className="sc">
          <table id="table-d">
            <colgroup>
              <col width="62" />
              <col width="68" />
              <col width="400" />
              <col width="82" />
              <col width="108" />
              <col width="95" />
              <col width="108" />
              <col width="70" />
              <col width="118" />
            </colgroup>
            <thead>
              <tr>
                <th></th>
                <th></th>
                <th></th>
                <th colSpan={2}>DIF CONGELADA</th>
                <th colSpan={2}>DIA ATUAL</th>
                <th colSpan={2}>DIFERENÇA</th>
              </tr>
              <tr className="h2">
                <th></th>
                <th>COD</th>
                <th>DESCRIÇÃO PRODUTO</th>
                <th>QTDE</th>
                <th>VALOR</th>
                <th>QTDE</th>
                <th>VALOR</th>
                <th>QTDE</th>
                <th>VALOR</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => (
                <tr key={`${r.c}-${idx}`}>
                  <td className="c">{r.f}</td>
                  <td className={codeCounts[r.c] > 1 ? 'dup' : ''}>{r.c}</td>
                  <td title={r.d}>{r.d}</td>
                  <td>{r.eq}</td>
                  <td>
                    <RenderMoney value={r.F} />
                  </td>
                  <td>{r.gq}</td>
                  <td>
                    <RenderMoney value={r.H} />
                  </td>
                  <td>{r.i}</td>
                  <td>
                    <RenderMoney value={r.j} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="tot">
          <div>DIF DIÁRIA</div>
          <div className={sal < 0 ? 'neg' : ''}>{Rt(sal)}</div>
        </div>
      </div>
    </section>
  );
};
