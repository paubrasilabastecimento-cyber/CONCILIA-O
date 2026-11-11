/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RawData, ResRow, AjustesData, MenRow, DiaRow, DashboardSnapshot, EstoqueCentralData, SavedPopupItem } from './data/types';
import { initialRawData, cervegelasRes, cervegelasMen } from './data/defaultRawData';
import { calculateProducts, CERVEGELA_CODES } from './utils/calc';
import {
  saveStateToFirestore,
  loadStateFromFirestore,
  logActionToFirestore,
  subscribeToState,
  savePopupsToFirestore,
  loadPopupsFromFirestore,
} from './firebase';
import { process020502, parseColL } from './utils/importer020502';
import { process020304 } from './utils/importer020304';
import { processTabelaPrecos } from './utils/importerPrecos';
// Snapshot storage removed

// Views
import { ResumoView } from './components/ResumoView';
import { AjustesView } from './components/AjustesView';
import { DifDiariaView } from './components/DifDiariaView';
import { DifMensalView } from './components/DifMensalView';
import { EstoqueCentralView } from './components/EstoqueCentralView';
import { DashboardView } from './components/DashboardView';
import { RecontagemView } from './components/RecontagemView';
import { createRecontagemFromProduct } from './data/defaultRecontagens';
import { RecontagemItem, ContagemEstoqueItem } from './data/types';
import { consolidateContagens, getItemDateString, mergeContagemItems } from './utils/contagemUtils';

// Modals
import { Import020502Modal } from './components/Import020502Modal';
import { ImportPrecosModal } from './components/ImportPrecosModal';
import { LogsModal } from './components/LogsModal';
import { Modal } from './components/Modal';
import { SalvarDifModal } from './components/SalvarDifModal';
import { PasswordModal } from './components/PasswordModal';
import { EvolucaoDiariaView } from './components/EvolucaoDiariaView';
import { ProdutosView } from './components/ProdutosView';
import { PopupsSalvosView } from './components/PopupsSalvosView';

type TabKey = 'dashboard' | 'popups_salvos' | 'resumo' | 'ajustes' | 'dif_diaria' | 'dif_mensal' | 'ec' | 'recontagem' | 'produtos';

export default function App() {
  // Estado centralizado e persistido 100% no Firebase Firestore
  const [data, setData] = useState<RawData>(initialRawData);

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [history, setHistory] = useState<{ data: RawData; desc: string }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Pop-ups Salvos para Auditoria persistidos exclusivamente no Firestore
  const [savedPopups, setSavedPopups] = useState<SavedPopupItem[]>([]);

  useEffect(() => {
    if (savedPopups.length > 0) {
      savePopupsToFirestore(savedPopups);
    }
  }, [savedPopups]);

  const handleSavePopup = (item: SavedPopupItem) => {
    setSavedPopups((prev) => {
      const existingIndex = prev.findIndex((p) => p.code === item.code && p.isFalta === item.isFalta);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = item;
        setToastMessage(`✓ Pop-up de [${item.code}] ${item.desc} atualizado na aba POP-UPS SALVOS!`);
        return updated;
      }
      setToastMessage(`✓ Pop-up de [${item.code}] ${item.desc} salvo na aba POP-UPS SALVOS!`);
      return [item, ...prev];
    });
  };

  const handleRemoveSavedPopup = (id: string) => {
    setSavedPopups((prev) => prev.filter((p) => p.id !== id));
    setToastMessage(`Item removido dos Pop-ups Salvos.`);
  };

  const handleClearSavedPopups = () => {
    setSavedPopups([]);
    setToastMessage(`Todos os Pop-ups Salvos foram limpos.`);
  };

  // Modais e Banners
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportPrecosModalOpen, setIsImportPrecosModalOpen] = useState(false);
  const [importTargetTab, setImportTargetTab] = useState<'dashboard' | 'ec' | 'grade'>('ec');
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isSalvarDifModalOpen, setIsSalvarDifModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [protectedAction, setProtectedAction] = useState<(() => void) | null>(null);

  const runProtectedAction = (action: () => void) => {
    setProtectedAction(() => action);
    setIsPasswordModalOpen(true);
  };
  const [t7BannerHtml, setT7BannerHtml] = useState<string | null>(null);
  const [ecBannerHtml, setEcBannerHtml] = useState<string | null>(null);
  const [precosBannerHtml, setPrecosBannerHtml] = useState<string | null>(null);
  const [ec0304BannerHtml, setEc0304BannerHtml] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Estado de conexão em tempo real com todos os usuários
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  // Carrega do Firestore ao iniciar e escuta alterações em tempo real (100% real-time para todos os usuários)
  useEffect(() => {
    let isMounted = true;

    async function initFirestore() {
      const [remote, popups] = await Promise.all([
        loadStateFromFirestore(),
        loadPopupsFromFirestore(),
      ]);
      if (remote && isMounted) {
        setData(remote);
        setIsRealtimeActive(true);
      }
      if (popups && popups.length > 0 && isMounted) {
        setSavedPopups(popups);
      }
    }
    initFirestore();

    const unsubscribe = subscribeToState(
      (remoteData, action) => {
        if (!isMounted) return;
        setData(remoteData);
        setIsRealtimeActive(true);
        if (action) {
          setToastMessage(`⚡ Sincronizado em tempo real: ${action}`);
        }
      },
      (contagensItems, action) => {
        if (!isMounted) return;
        setData((prev) => ({
          ...prev,
          contagensEstoque: consolidateContagens(contagensItems),
        }));
        setIsRealtimeActive(true);
        if (action) {
          setToastMessage(`⚡ Contagem atualizada por outro usuário (${action})`);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Push para histórico
  const pushHistory = (newData: RawData, description: string) => {
    const trimmed = history.slice(0, historyIndex + 1);
    setHistory([...trimmed, { data: newData, desc: description }]);
    setHistoryIndex(trimmed.length);
  };

  const updateDataWithHistory = (newData: RawData, description: string) => {
    pushHistory(newData, description);
    setData(newData);
    saveStateToFirestore(newData, description);
  };

  // Cálculo reativo dos produtos para Dashboard e Resumo
  const { C: calculatedProducts, CM: calculatedMap } = useMemo(() => {
    return calculateProducts(data);
  }, [data]);

  // Cálculo reativo 100% independente dos produtos para a GRADE
  const { C: gradeCalculatedProducts, CM: gradeCalculatedMap } = useMemo(() => {
    const gradeData: RawData = {
      ...data,
      res: data.gradeRes || data.res,
    };
    return calculateProducts(gradeData);
  }, [data.gradeRes, data.res, data.aj, data.xs, data.dia, data.men]);

  // Atualização de uma célula do Resumo (Disponível G ou Inventário J)
  const handleUpdateRes = (index: number, key: 'G' | 'J', value: number) => {
    const newRes = [...data.res];
    const row = [...newRes[index]] as ResRow;
    const colIndex = key === 'G' ? 3 : 7;
    const oldVal = row[colIndex];
    if (oldVal === value) return;

    row[colIndex] = value;
    newRes[index] = row;

    const desc = `Alterou ${key === 'G' ? 'Disponível Promax' : 'Inventário'} do item ${row[0]} (${row[1]}) de ${oldVal} para ${value}`;
    const nextData = { ...data, res: newRes };
    updateDataWithHistory(nextData, desc);
  };

  // Atualização dos Ajustes
  const handleUpdateAjustes = (newAj: AjustesData) => {
    const nextData = { ...data, aj: newAj };
    updateDataWithHistory(nextData, 'Atualização nas tabelas de ajustes');
  };

  // Abertura do modal de importação centralizado em Estoque Central
  const handleOpenImportModalForTab = (tab: 'dashboard' | 'ec' | 'grade' = 'ec') => {
    setImportTargetTab('ec');
    setIsImportModalOpen(true);
  };

  // Snapshots removidos
  const [snapshots] = useState<DashboardSnapshot[]>([]);
  const handleSaveSnapshot = () => {};
  const handleDeleteSnapshot = () => {};

  // Importação do relatório 02.05.02 (Centralizado na aba de Estoque Central e propagado para toda a plataforma)
  const handleImport020502 = (
    content: string,
    fileName: string,
    targetTab: 'dashboard' | 'ec' | 'grade' = 'ec',
    autoSaveDailySnapshot: boolean = false
  ) => {
    try {
      const res = process020502(content, fileName, data, 'ec');
      if (res.success && res.nextData) {
        let finalData = res.nextData;



        updateDataWithHistory(finalData, `Importação 02.05.02 (Estoque Central): ${fileName}`);
        setEcBannerHtml(res.bannerHtml || null);
        setIsImportModalOpen(false);
        setToastMessage(`✓ Relatório 02.05.02 importado com sucesso no Estoque Central!`);
      } else {
        alert(res.message || 'Erro ao processar importação 02.05.02');
      }
    } catch (e: any) {
      alert(`Falha ao importar: ${e?.message || e}`);
    }
  };

  // Carrega uma 02.05.02 salva histórica diretamente para o Estoque Central e navega para a aba
  const handleLoadSaved020502ToPlatform = (snapshot: DashboardSnapshot) => {
    if (!snapshot.ec || !snapshot.ec.h || !snapshot.ec.r || snapshot.ec.r.length === 0) {
      alert('Os dados da 02.05.02 desta data não estão disponíveis ou estão vazios.');
      return;
    }

    try {
      const newEc: EstoqueCentralData = {
        h: [...snapshot.ec.h],
        r: snapshot.ec.r.map((row) => [...row]),
      };

      let nextRes = data.res;
      if (snapshot.res && Array.isArray(snapshot.res) && snapshot.res.length > 0) {
        nextRes = snapshot.res.map((r) => [...r] as typeof r);
      } else {
        const ip = newEc.h.indexOf('Produto') >= 0 ? newEc.h.indexOf('Produto') : 3;
        const idisp = newEc.h.indexOf('Disponivel') >= 0 ? newEc.h.indexOf('Disponivel') : 11;
        const ecMap = new Map<number, number>();
        newEc.r.forEach((r) => {
          const cod = Number(r[ip]);
          const disp = parseColL(r[idisp]);
          if (!isNaN(cod) && cod > 0) {
            ecMap.set(cod, disp);
          }
        });

        nextRes = data.res.map((r) => {
          const cod = r[0];
          if (ecMap.has(cod)) {
            const rowCopy = [...r] as typeof r;
            const fator = rowCopy[4] > 0 ? rowCopy[4] : 1;
            const dispCx = ecMap.get(cod) || 0;
            rowCopy[3] = Math.round(dispCx * fator);
            return rowCopy;
          }
          return r;
        });
      }

      const nextData: RawData = {
        ...data,
        ec: newEc,
        res: nextRes,
      };

      updateDataWithHistory(
        nextData,
        `Carregou 02.05.02 salva do dia ${snapshot.date.split('-').reverse().join('/')} no Estoque Central`
      );

      // Muda para a aba de Estoque Central para visualização imediata
      setActiveTab('ec');
      setToastMessage(
        `✓ 02.05.02 do dia ${snapshot.date.split('-').reverse().join('/')} carregada com sucesso no Estoque Central!`
      );
    } catch (e: any) {
      console.error('Erro ao carregar 02.05.02:', e);
      alert(`Falha ao carregar relatório: ${e?.message || e}`);
    }
  };

  // Importação de Tabela de Preços (Tabela 7) via Estoque Central
  const handleImportPrecos = (content: string, fileName: string) => {
    try {
      const res = processTabelaPrecos(content, fileName, data);
      if (res.success && res.nextData) {
        updateDataWithHistory(
          res.nextData,
          `Importou Tabela de Preços (${fileName}): ${res.matchedCount} produtos atualizados`
        );
        setPrecosBannerHtml(res.bannerHtml || null);
        setIsImportPrecosModalOpen(false);
      } else {
        alert(res.message || 'Erro ao processar Tabela de Preços');
      }
    } catch (e: any) {
      alert(`Falha ao importar Tabela de Preços: ${e?.message || e}`);
    }
  };

  // Importação do relatório 02.05.02 específica para a Grade
  const handleGradeImport020502 = (content: string, fileName: string) => {
    try {
      const res = process020502(content, fileName, data, 'grade');
      if (res.success && res.nextData) {
        updateDataWithHistory(
          res.nextData,
          `Importou 02.05.02 para a Grade: ${fileName} (${res.nextData.gradeEc?.r?.length || 0} produtos)`
        );
        setToastMessage(`✓ Relatório 02.05.02 importado com sucesso na Grade!`);
      } else {
        const lines = String(content)
          .replace(/\r/g, '')
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lines.length < 2) {
          alert('Arquivo 02.05.02 vazio ou sem linhas suficientes.');
          return;
        }
        let sep = ';';
        const firstLines = lines.slice(0, 20).join('\n');
        if ((firstLines.match(/\t/g) || []).length > (firstLines.match(/;/g) || []).length) {
          sep = '\t';
        }
        const body = lines.map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, '').trim()));
        const header = body[0];
        const dataRows = body.slice(1);

        const gradeEc = {
          h: header,
          r: dataRows,
        };

        const nextData = {
          ...data,
          gradeEc,
        };

        updateDataWithHistory(nextData, `Importou 02.05.02 para a Grade: ${fileName} (${dataRows.length} itens)`);
        setToastMessage(`✓ Relatório 02.05.02 importado com sucesso na Grade! (${dataRows.length} itens)`);
      }
    } catch (e: any) {
      alert(`Erro ao importar 02.05.02 para a Grade: ${e?.message || e}`);
    }
  };

  // Importação do relatório 02.03.04 específica para a Grade Independente
  const handleGradeImport020304 = (content: string, fileName: string) => {
    try {
      const res = process020304(content, fileName, data);
      if (res.success && res.nextData && res.nextData.ec0304) {
        const nextData = {
          ...data,
          ec0304: res.nextData.ec0304,
        };
        const count = res.matchedCount || res.nextData.ec0304.r.length;
        updateDataWithHistory(nextData, `Importou 02.03.04 para a Grade: ${fileName} (${count} produtos)`);
        setToastMessage(`✓ Relatório 02.03.04 importado: ${count} produtos carregados na coluna Saldo!`);
      } else {
        alert(res.message || 'Erro ao processar importação 02.03.04');
      }
    } catch (e: any) {
      alert(`Falha ao importar 02.03.04 para a Grade: ${e?.message || e}`);
    }
  };

  // Limpar relatório 02.03.04 da Grade
  const handleClearGrade020304 = () => {
    const nextData = {
      ...data,
      ec0304: undefined,
    };
    updateDataWithHistory(nextData, 'Removeu relatório 02.03.04 da Grade (saldo voltou para Tabela 7)');
    setToastMessage('✓ Relatório 02.03.04 removido da Grade. O saldo voltou para a Tabela 7.');
  };

  // Importação de Tabela 7
  const handleImportT7 = (content: string, fileName: string) => {
    try {
      const lines = content.split('\n');
      let count = 0;
      const newRes = [...data.res];
      const resMap = new Map(newRes.map((r, i) => [r[0], i]));

      lines.forEach((line) => {
        const cleanLine = line.trim();
        if (!cleanLine) return;
        let parts = cleanLine.split('\t');
        if (parts.length < 2) parts = cleanLine.split(';');
        if (parts.length < 2) parts = cleanLine.split(',');

        if (parts.length >= 2) {
          const codStr = parts[0].trim().replace(/\D/g, '');
          const cod = Number(codStr);
          if (!isNaN(cod) && cod > 0) {
            let valStr = parts[1].trim();
            let val = 0;
            if (valStr.includes(',') && valStr.includes('.')) {
              val = parseFloat(valStr.replace(/\./g, '').replace(',', '.')) || 0;
            } else if (valStr.includes(',')) {
              val = parseFloat(valStr.replace(',', '.')) || 0;
            } else {
              val = parseFloat(valStr) || 0;
            }

            if (resMap.has(cod)) {
              const idx = resMap.get(cod)!;
              const row = [...newRes[idx]] as ResRow;
              row[3] = val; // Atualiza Disponível Promax
              newRes[idx] = row;
              count++;
            }
          }
        }
      });

      const nextData = { ...data, res: newRes, gradeRes: newRes };
      updateDataWithHistory(nextData, `Importou Tabela 7 (${fileName}): ${count} produtos`);
      setT7BannerHtml(`<b>Tabela 7 importada com sucesso:</b> ${count} produtos atualizados a partir de ${fileName}.`);
    } catch (e: any) {
      alert(`Erro ao importar Tabela 7: ${e?.message || e}`);
    }
  };

  // Ações do Dashboard
  const handleCongelar = () => {
    runProtectedAction(async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Congelar & Salvar Conciliação do Dia',
      message: 'Deseja congelar as diferenças e salvar automaticamente a conciliação do dia atual (Dia 15) no histórico mensal (DIF Mensal)?',
      onConfirm: async () => {
        const targetDay = new Date().getDate(); // Dia 15
        const dayIndex = targetDay - 1;

        // 1. Mapeia as linhas de data.men existentes pelo código do produto
        const menMap = new Map<number, number>();
        const newMen: MenRow[] = data.men.map((row, idx) => {
          menMap.set(row[0], idx);
          return [...row] as MenRow;
        });

        let updatedCount = 0;
        let nonZeroCount = 0;

        calculatedProducts.forEach((calc) => {
          const code = calc.c;
          const diff = calc.R;

          if (menMap.has(code)) {
            const idx = menMap.get(code)!;
            const row = newMen[idx];
            const days = [...row[4]];
            days[dayIndex] = diff;
            const newTotal = days.reduce<number>((acc, v) => acc + (v || 0), 0);
            newMen[idx] = [row[0], calc.d || row[1], calc.X || row[2], row[3], days, newTotal];
            updatedCount++;
            if (diff !== 0) nonZeroCount++;
          } else {
            const days: (number | null)[] = new Array(31).fill(null);
            days[dayIndex] = diff;
            newMen.push([calc.c, calc.d, calc.X, 0, days, diff]);
            menMap.set(code, newMen.length - 1);
            updatedCount++;
            if (diff !== 0) nonZeroCount++;
          }
        });

        // 2. Atualiza também data.dia (congelando as diferenças do dia)
        const existingDiaMap = new Map<number, [number, number, number]>();
        data.dia.forEach((d) => existingDiaMap.set(d[0], d));

        const nextDia: DiaRow[] = calculatedProducts.map((p) => {
          const currDiff = p.R;
          const prev = existingDiaMap.get(p.c);
          const gq = prev ? prev[2] : 0;
          return [p.c, currDiff, gq];
        });

        const nextData: RawData = {
          ...data,
          men: newMen,
          dia: nextDia,
        };

        const actionDesc = `Congelamento e salvamento automático da conciliação no Dia ${targetDay} (${nonZeroCount} divergências)`;
        pushHistory(nextData, actionDesc);
        setData(nextData);
        await saveStateToFirestore(nextData, 'Congelar Dia ' + targetDay, actionDesc, true);

        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setToastMessage(`✅ Conciliação do Dia ${targetDay} congelada e salva com sucesso (${nonZeroCount} divergências)!`);
      },
    });
  });
};

  const handleSalvar = () => {
    setIsSalvarDifModalOpen(true);
  };

  const handleConfirmSaveDif = (targetDay: number) => {
    runProtectedAction(async () => {
    const dayIndex = targetDay - 1;

    // 1. Mapeia as linhas de data.men existentes pelo código do produto
    const menMap = new Map<number, number>();
    const newMen: MenRow[] = data.men.map((row, idx) => {
      menMap.set(row[0], idx);
      return [...row] as MenRow;
    });

    let updatedCount = 0;
    let nonZeroCount = 0;

    // 2. Grava a diferença em caixas para cada produto da conciliação
    calculatedProducts.forEach((calc) => {
      const code = calc.c;
      const diff = calc.R;

      if (menMap.has(code)) {
        const idx = menMap.get(code)!;
        const row = newMen[idx];
        const days = [...row[4]];
        days[dayIndex] = diff;
        const newTotal = days.reduce<number>((acc, v) => acc + (v || 0), 0);
        newMen[idx] = [row[0], calc.d || row[1], calc.X || row[2], row[3], days, newTotal];
        updatedCount++;
        if (diff !== 0) nonZeroCount++;
      } else {
        const days: (number | null)[] = new Array(31).fill(null);
        days[dayIndex] = diff;
        newMen.push([calc.c, calc.d, calc.X, 0, days, diff]);
        menMap.set(code, newMen.length - 1);
        updatedCount++;
        if (diff !== 0) nonZeroCount++;
      }
    });

    // 3. Atualiza também data.dia (congelando as diferenças do dia para o comparativo / DIF 1)
    const existingDiaMap = new Map<number, [number, number, number]>();
    data.dia.forEach((d) => existingDiaMap.set(d[0], d));

    const nextDia: DiaRow[] = calculatedProducts.map((p) => {
      const currDiff = p.R;
      const prev = existingDiaMap.get(p.c);
      const gq = prev ? prev[2] : 0;
      return [p.c, currDiff, gq];
    });

    const nextData: RawData = {
      ...data,
      men: newMen,
      dia: nextDia,
    };

    const actionDesc = `Salva DIF da conciliação no Dia ${targetDay} da DIF Mensal (${nonZeroCount} divergências)`;
    pushHistory(nextData, actionDesc);
    setData(nextData);

    // 4. Salva e sincroniza com Firebase (imediato com backoff resiliente)
    const success = await saveStateToFirestore(nextData, 'Salvamento DIF Dia ' + targetDay, actionDesc, true);
    if (success) {
      alert(`DIF do Dia ${targetDay} salva com sucesso na DIF Mensal e sincronizada com o Firebase!\n\n${updatedCount} produtos atualizados no calendário (${nonZeroCount} com divergência).`);
    } else {
      alert(`DIF salva localmente no Dia ${targetDay} da DIF Mensal. (Falha de conexão com o Firebase).`);
    }
  });
};

  const handleLimpar = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Limpar Diferenças (Zerar Divergências)',
      message: 'Deseja igualar o estoque físico ao sistema Promax e zerar todas as diferenças da conciliação atual (saldo zerado)?',
      onConfirm: () => {
        const clearedRes = data.res.map((r) => {
          const row = [...r] as ResRow;
          row[7] = row[3]; // contagem física b = Disponível Promax G (diferença zerada)
          row[8] = 0;      // repack
          row[9] = 0;      // ajuste M
          row[10] = 0;     // ajuste N
          row[11] = 0;     // ajuste O
          return row;
        });
        const nextDia = data.dia.map((d) => [d[0], 0, 0] as [number, number, number]);
        const nextData: RawData = { ...data, res: clearedRes, dia: nextDia };
        updateDataWithHistory(nextData, 'Limpeza e regularização das diferenças (Base Zerada)');
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleVoltarOriginal = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Restaurar Base Limpa (Zerada)',
      message: 'Deseja descartar as alterações e restaurar a base oficial 100% zerada (sem divergências, DIF Diária zerada e DIF Mensal limpa)?',
      onConfirm: () => {
        updateDataWithHistory(initialRawData, 'Restauração da base original zerada');
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Ações da DIF Mensal
  const handleUpdateMen = (newMen: MenRow[], description: string) => {
    runProtectedAction(() => {
      const nextData = { ...data, men: newMen };
      updateDataWithHistory(nextData, description);
    });
  };

  const handleClearMenDay = (day: number) => {
    let clearedCount = 0;
    const newMen = data.men.map((r) => {
      const row = [...r] as MenRow;
      const days = [...row[4]];
      if (days[day - 1] !== null) {
        clearedCount++;
      }
      days[day - 1] = null;
      const soma = days.reduce<number>((acc, v) => acc + (v || 0), 0);
      return [row[0], row[1], row[2], row[3], days, soma] as MenRow;
    });
    updateDataWithHistory(
      { ...data, men: newMen },
      `Limpeza dos lançamentos do Dia ${day} na DIF Mensal (${clearedCount} produtos zerados)`
    );
  };

  const handleResetAllMen = (options?: { resetFechamentoMode?: 'keep' | 'last_day' | 'zero' }) => {
    const mode = options?.resetFechamentoMode || 'keep';
    let lastActiveDay = 0;
    if (mode === 'last_day') {
      data.men.forEach((r) => {
        r[4].forEach((v, i) => {
          if (v !== null && i + 1 > lastActiveDay) lastActiveDay = i + 1;
        });
      });
    }

    const newMen = data.men.map((r) => {
      const row = [...r] as MenRow;
      const emptyDays: (number | null)[] = Array(31).fill(null);
      let newFechamento = row[3];
      if (mode === 'zero') {
        newFechamento = 0;
      } else if (mode === 'last_day' && lastActiveDay > 0) {
        const lastVal = row[4][lastActiveDay - 1];
        if (lastVal !== null) {
          newFechamento = lastVal;
        }
      }
      return [row[0], row[1], row[2], newFechamento, emptyDays, 0] as MenRow;
    });

    const descMsg =
      mode === 'zero'
        ? 'DIF Mensal zerada 100% (dias e fechamentos) para novo mês'
        : mode === 'last_day'
        ? 'DIF Mensal zerada com fechamento atualizado pelo último dia para novo mês'
        : 'DIF Mensal zerada (todos os dias 1..31 limpos) para novo mês';

    updateDataWithHistory({ ...data, men: newMen }, descMsg);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setData(history[prevIndex].data);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setData(history[nextIndex].data);
    }
  };

  // Recontagem States & Handlers
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  const handleRecontar = (code: number) => {
    const prod = calculatedProducts.find((p) => p.c === code);
    const currentRecontagens = data.recontagens || [];
    let nextRecontagens = [...currentRecontagens];
    const existing = currentRecontagens.find((r) => r.cod === code);

    if (!existing && prod) {
      const newItem = createRecontagemFromProduct(prod);
      nextRecontagens = [newItem, ...nextRecontagens];
      updateDataWithHistory(
        { ...data, recontagens: nextRecontagens },
        `Adicionou item ${code} (${prod.d}) à Recontagem`
      );
    }

    // Não muda de aba! Apenas informa com texto simples conforme solicitado
    setToastMessage(`Item ${code} enviado para a aba de Recontagem.`);
  };

  const handleUpdateRecontagem = (item: RecontagemItem, desc?: string) => {
    const current = data.recontagens || [];
    const next = current.map((r) => (r.id === item.id ? item : r));
    updateDataWithHistory(
      { ...data, recontagens: next },
      desc || `Atualizou recontagem do item ${item.cod}`
    );
  };

  const handleDeleteRecontagem = (id: string) => {
    const current = data.recontagens || [];
    const itemToDelete = current.find((r) => r.id === id || String(r.cod) === id);
    const next = current.filter((r) => r.id !== id && String(r.cod) !== id);
    const codName = itemToDelete?.cod || '';
    updateDataWithHistory(
      { ...data, recontagens: next },
      `Removeu item ${codName} da fila de recontagem`
    );
    setToastMessage(`✓ Item ${codName} excluído da recontagem.`);
  };

  const handleClearAjustados = () => {
    const current = data.recontagens || [];
    const next = current.filter((r) => r.status !== 'ajustado');
    updateDataWithHistory(
      { ...data, recontagens: next },
      'Limpeza de itens ajustados da Recontagem'
    );
    setToastMessage('Itens ajustados removidos da recontagem.');
  };

  const handleClearAllRecontagens = () => {
    updateDataWithHistory(
      { ...data, recontagens: [] },
      'Limpeza total da fila de Recontagem'
    );
    setToastMessage('Fila de recontagem limpa.');
  };

  const handleAplicarRecontagemAoEstoque = (item: RecontagemItem) => {
    const finalUnid = item.novaContagemUnid ?? (item.novaContagemCx || 0) * (item.fatorCx || 1);
    const finalCx = item.novaContagemCx ?? Math.floor(finalUnid / (item.fatorCx || 1));

    // 1. Atualiza na tabela res (coluna 7: b - inventário físico)
    const resIdx = data.res.findIndex((r) => r[0] === item.cod);
    let nextRes = [...data.res];
    if (resIdx !== -1) {
      const row = [...nextRes[resIdx]] as ResRow;
      row[7] = finalUnid;
      nextRes[resIdx] = row;
    }

    // 2. Atualiza status na lista de recontagens
    const currentRecontagens = data.recontagens || [];
    const nextRecontagens = currentRecontagens.map((r) =>
      r.id === item.id
        ? {
            ...item,
            status: 'ajustado' as const,
            novaContagemUnid: finalUnid,
            novaContagemCx: finalCx,
            ajustadoEm: new Date().toLocaleString('pt-BR'),
          }
        : r
    );

    const desc = `Recontagem aplicada na base: Item ${item.cod} (${item.desc}) ajustado para ${finalCx} cx (${finalUnid} un)`;
    const nextData = {
      ...data,
      res: nextRes,
      recontagens: nextRecontagens,
    };

    updateDataWithHistory(nextData, desc);
    setToastMessage(`✅ Estoque do item ${item.cod} ajustado com sucesso na base oficial!`);
  };

  const handleToggleDesativar = (code: number) => {
    const currentList = data.desativados || [];
    const isDesativado = currentList.includes(code);
    const prodDesc = calculatedMap[code]?.d || `Item ${code}`;

    const nextList = isDesativado
      ? currentList.filter((c) => c !== code)
      : [...currentList, code];

    const actionDesc = isDesativado
      ? `Reativou na plataforma: ${code} - ${prodDesc}`
      : `Desativou da plataforma por inteiro: ${code} - ${prodDesc}`;

    const nextData: RawData = {
      ...data,
      desativados: nextList,
    };

    updateDataWithHistory(nextData, actionDesc);
    setToastMessage(
      isDesativado
        ? `✅ Produto ${code} foi reativado na plataforma com sucesso!`
        : `🚫 Produto ${code} foi desativado da plataforma por inteiro (removido dos cálculos e dashboards).`
    );
  };

  const handleUpdateProductPrice = (
    code: number,
    precoCx: number,
    fatorCx?: number,
    fatorHl?: number
  ) => {
    let updatedDesc = '';
    let oldP = 0;
    let found = false;

    const newRes = data.res.map((r) => {
      const row = [...r] as ResRow;
      if (row[0] === code) {
        found = true;
        oldP = row[5];
        row[5] = precoCx;
        if (fatorCx !== undefined && fatorCx > 0) {
          row[4] = fatorCx;
        }
        if (fatorHl !== undefined && fatorHl >= 0) {
          row[6] = fatorHl;
        }
        updatedDesc = row[1];
      }
      return row;
    });

    if (!found) {
      const baseItem = data.ec?.r?.find((row) => Number(row[3]) === code);
      const desc = baseItem ? String(baseItem[4]) : `PRODUTO ${code}`;
      const f = fatorCx !== undefined && fatorCx > 0 ? fatorCx : 1;
      const newRow: ResRow = [
        code,
        desc,
        'cx',
        0, // G
        f, // V0
        precoCx, // U
        fatorHl || 0, // X
        0, // b
        0, // P
        0, // rm
        0, // rn
        0, // ro
      ];
      newRes.push(newRow);
      updatedDesc = desc;
    }

    const nextData: RawData = {
      ...data,
      res: newRes,
      gradeRes: data.gradeRes ? newRes : undefined,
    };

    const actionDesc = `Definiu preço do produto #${code} (${updatedDesc || 'Item'}): R$ ${precoCx.toFixed(2).replace('.', ',')}`;
    updateDataWithHistory(nextData, actionDesc);
    setToastMessage(`✓ Preço do produto #${code} salvo com sucesso: R$ ${precoCx.toFixed(2).replace('.', ',')}!`);
  };

  const handleSaveContagemEstoque = (item: ContagemEstoqueItem) => {
    const list = data.contagensEstoque || [];
    const itemDate = getItemDateString(item);

    const existingIndex = list.findIndex(
      (c) =>
        c.id === item.id ||
        (c.cod === item.cod && getItemDateString(c) === itemDate)
    );

    let updatedList: ContagemEstoqueItem[];
    let wasMerged = false;

    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      if (item.id === existing.id) {
        // Atualização direta
        updatedList = list.map((c, i) => (i === existingIndex ? item : c));
      } else {
        // Código igual em lançamento novo: SOMA as quantidades
        const merged = mergeContagemItems(existing, item);
        updatedList = list.map((c, i) => (i === existingIndex ? merged : c));
        wasMerged = true;
      }
    } else {
      updatedList = [item, ...list];
    }

    const consolidated = consolidateContagens(updatedList);
    const nextData: RawData = {
      ...data,
      contagensEstoque: consolidated,
    };
    const logText = wasMerged
      ? `Somou contagem do produto #${item.cod} (${item.desc || ''}): total atualizado para ${item.totalCaixasFormatado} cx`
      : `Registrou contagem de estoque do produto #${item.cod} (${item.totalCaixasFormatado} cx)`;
    updateDataWithHistory(nextData, logText);
  };

  const handleUpdateContagemEstoque = (item: ContagemEstoqueItem) => {
    const list = data.contagensEstoque || [];
    const itemDate = getItemDateString(item);
    // Atualiza o item e limpa eventuais duplicatas anteriores do mesmo código na data
    const filtered = list.filter(
      (c) => c.id === item.id || !(c.cod === item.cod && getItemDateString(c) === itemDate)
    );
    const updatedList = filtered.map((c) => (c.id === item.id ? item : c));
    const exists = updatedList.some((c) => c.id === item.id);
    const finalList = exists ? updatedList : [item, ...updatedList];

    const nextData: RawData = {
      ...data,
      contagensEstoque: consolidateContagens(finalList),
    };
    updateDataWithHistory(nextData, `Atualizou contagem de estoque do produto #${item.cod}`);
  };

  const handleDeleteContagemEstoque = (id: string) => {
    const list = data.contagensEstoque || [];
    const target = list.find((c) => c.id === id);
    const targetDate = target ? getItemDateString(target) : '';
    const updatedList = list.filter((c) => {
      if (c.id === id) return false;
      if (target && c.cod === target.cod && getItemDateString(c) === targetDate) return false;
      return true;
    });
    const nextData: RawData = {
      ...data,
      contagensEstoque: consolidateContagens(updatedList),
    };
    updateDataWithHistory(nextData, `Excluiu contagem de estoque ${target ? `#${target.cod}` : ''}`);
  };

  const handleClearAllContagensEstoque = () => {
    const nextData: RawData = {
      ...data,
      contagensEstoque: [],
    };
    updateDataWithHistory(nextData, 'Limpou todas as contagens de estoque');
  };

  const handleAplicarContagensAoEstoque = (items: ContagemEstoqueItem[]) => {
    const itemMap = new Map<number, number>();
    items.forEach((it) => {
      itemMap.set(it.cod, it.totalUnidades);
    });

    const newRes = data.res.map((r) => {
      const row = [...r] as ResRow;
      if (itemMap.has(row[0])) {
        row[7] = itemMap.get(row[0])!; // Coluna b (inventário físico em unidades)
      }
      return row;
    });

    const nextData: RawData = {
      ...data,
      res: newRes,
      gradeRes: data.gradeRes ? newRes : undefined,
    };

    updateDataWithHistory(nextData, `Aplicou contagem física de ${items.length} produtos ao inventário base`);
    setToastMessage(`✓ ${items.length} contagens físicas aplicadas com sucesso ao inventário do sistema!`);
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans w-full max-w-full overflow-x-hidden">
      {/* Top Black Bar */}
      <div className="top-black-bar print:hidden" />

      {/* Main Navigation Tabs */}
      <nav className="app-nav print:hidden">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginRight: '6px' }}>
          <b>ESTOQUE OFICIAL GUARABIRA</b>
          <span
            style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              backgroundColor: isRealtimeActive ? '#16a34a' : '#eab308',
              boxShadow: isRealtimeActive ? '0 0 6px #22c55e' : 'none',
              display: 'inline-block',
              transition: 'all 0.3s ease',
            }}
            title={
              isRealtimeActive
                ? 'Conectado em tempo real com todos os usuários via Firebase'
                : 'Conectando ao banco em tempo real...'
            }
          />
        </div>

        <button
          className={`k-tab ${activeTab === 'dashboard' ? 'on' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          DASHBOARD
        </button>

        <button
          className={activeTab === 'popups_salvos' ? 'on' : ''}
          onClick={() => setActiveTab('popups_salvos')}
          style={
            activeTab === 'popups_salvos'
              ? { background: '#7C3AED', color: '#FFFFFF', borderColor: '#A78BFA', fontWeight: '800' }
              : { background: '#6D28D9', color: '#EDE9FE', fontWeight: 'bold' }
          }
          title="Aba de Pop-ups Salvos: Selecione produtos dando duplo clique na quantidade (QTDE) no Dashboard"
        >
          POP-UPS SALVOS
          {savedPopups.length > 0 && (
            <span
              style={{
                marginLeft: '5px',
                background: activeTab === 'popups_salvos' ? '#FFFFFF' : '#FFC000',
                color: '#000000',
                borderRadius: '999px',
                padding: '1px 6px',
                fontSize: '9.5px',
                fontWeight: 'bold',
              }}
            >
              {savedPopups.length}
            </span>
          )}
        </button>



        <button
          className={activeTab === 'resumo' ? 'on' : ''}
          onClick={() => setActiveTab('resumo')}
        >
          RESUMO
        </button>

        <button
          className={activeTab === 'ajustes' ? 'on' : ''}
          onClick={() => setActiveTab('ajustes')}
        >
          AJUSTES
        </button>

        <button
          className={activeTab === 'dif_diaria' ? 'on' : ''}
          onClick={() => setActiveTab('dif_diaria')}
        >
          DIF DIÁRIA
        </button>

        <button
          className={activeTab === 'dif_mensal' ? 'on' : ''}
          onClick={() => setActiveTab('dif_mensal')}
        >
          DIF MENSAL
        </button>

        <button
          className={activeTab === 'ec' ? 'on' : ''}
          onClick={() => setActiveTab('ec')}
        >
          ESTOQUE CENTRAL
        </button>









        <button
          className={activeTab === 'recontagem' ? 'on' : ''}
          onClick={() => setActiveTab('recontagem')}
          style={
            activeTab === 'recontagem'
              ? { background: '#D97706', color: '#fff' }
              : { background: '#B45309', color: '#FEF3C7' }
          }
          title="Aba de Recontagem Física e Auditoria Cega de Itens (Ativada por duplo clique no COD)"
        >
          RECONTAGEM
          {(data.recontagens?.length || 0) > 0 && (
            <span
              style={{
                marginLeft: '4px',
                background: activeTab === 'recontagem' ? '#fff' : '#000',
                color: activeTab === 'recontagem' ? '#000' : '#FFC000',
                borderRadius: '999px',
                padding: '0 4px',
                fontSize: '9px',
                fontWeight: 'bold',
              }}
            >
              {data.recontagens?.length}
            </span>
          )}
        </button>

        <button
          className={activeTab === 'produtos' ? 'on' : ''}
          onClick={() => setActiveTab('produtos')}
          style={
            activeTab === 'produtos'
              ? { background: '#0F172A', color: '#fff' }
              : { background: '#1E293B', color: '#E2E8F0' }
          }
          title="Catálogo Geral: Todos os produtos cadastrados na plataforma com códigos, preços, estoques e divergências"
        >
          TODOS OS PRODUTOS
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full pb-10">
        {activeTab === 'resumo' && (
          <ResumoView
            calculated={calculatedProducts}
            onUpdateRes={handleUpdateRes}
            onImportT7={handleImportT7}
            t7BannerHtml={t7BannerHtml}
            ecBannerHtml={ecBannerHtml}
            onRecontar={handleRecontar}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'ajustes' && (
          <AjustesView
            ajustes={data.aj}
            calculatedMap={calculatedMap}
            onUpdateAjustes={handleUpdateAjustes}
          />
        )}

        {activeTab === 'dif_diaria' && (
          <DifDiariaView data={data} calculatedMap={calculatedMap} />
        )}

        {activeTab === 'dif_mensal' && (
          <DifMensalView
            men={data.men}
            calculatedMap={calculatedMap}
            onClearDay={handleClearMenDay}
            onResetAll={handleResetAllMen}
            onUpdateMen={handleUpdateMen}
            onSalvarDifToday={() => setIsSalvarDifModalOpen(true)}
          />
        )}

        {activeTab === 'ec' && (
          <EstoqueCentralView
            ec={data.ec}
            res={data.res}
            data={data}
            calculated={calculatedProducts}
            onSaveSnapshot={handleSaveSnapshot}
            onImport={(txt, nome) => handleImport020502(txt, nome, 'ec', false)}
            importBannerHtml={ecBannerHtml}
            onClearBanner={() => setEcBannerHtml(null)}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
            onNavigateToTab={(tab) => setActiveTab(tab as TabKey)}
            onOpenImportModal={() => {
              setImportTargetTab('ec');
              setIsImportModalOpen(true);
            }}
            onOpenImportPrecosModal={() => setIsImportPrecosModalOpen(true)}
            onImportPrecos={handleImportPrecos}
            precosBannerHtml={precosBannerHtml}
            onClearPrecosBanner={() => setPrecosBannerHtml(null)}
            ec0304BannerHtml={ec0304BannerHtml}
            onClearEc0304Banner={() => setEc0304BannerHtml(null)}
          />
        )}









        {activeTab === 'dashboard' && (
          <DashboardView
            data={data}
            calculated={calculatedProducts}
            onCongelar={handleCongelar}
            onSalvar={handleSalvar}
            onLimpar={handleLimpar}
            onVoltarOriginal={handleVoltarOriginal}
            onOpenImport020502={() => setActiveTab('ec')}
            onRecontar={handleRecontar}
            onToggleDesativar={handleToggleDesativar}
            onNavigateToProdutos={(search) => {
              setActiveTab('produtos');
            }}
            onSavePopup={handleSavePopup}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            lastActionDescription={history[historyIndex]?.desc}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
        )}

        {activeTab === 'popups_salvos' && (
          <PopupsSalvosView
            savedPopups={savedPopups}
            onRemovePopup={handleRemoveSavedPopup}
            onClearAll={handleClearSavedPopups}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'recontagem' && (
          <RecontagemView
            recontagens={data.recontagens || []}
            calculatedProducts={calculatedProducts}
            onUpdateRecontagem={handleUpdateRecontagem}
            onDeleteRecontagem={handleDeleteRecontagem}
            onClearAjustados={handleClearAjustados}
            onClearAll={handleClearAllRecontagens}
            onAplicarAoEstoque={handleAplicarRecontagemAoEstoque}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
          />
        )}


        {activeTab === 'produtos' && (
          <ProdutosView
            data={data}
            calculatedProducts={calculatedProducts}
            calculatedMap={calculatedMap}
            onRecontar={handleRecontar}
            onToggleDesativar={handleToggleDesativar}
            onNavigateToTab={(tab) => setActiveTab(tab as TabKey)}
            onUpdateProductPrice={handleUpdateProductPrice}
            onOpenImportPrecos={() => setIsImportPrecosModalOpen(true)}
          />
        )}
      </main>

      {/* Toast Notification Simples */}
      {toastMessage && (
        <div
          className="print:hidden"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            background: 'rgba(24, 24, 27, 0.95)',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: '6px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderLeft: '4px solid #FFC000',
            borderTop: '1px solid #3f3f46',
            borderRight: '1px solid #3f3f46',
            borderBottom: '1px solid #3f3f46',
          }}
        >
          <span>✓</span>
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '13px',
              marginLeft: '6px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Modais do Sistema */}
      <Import020502Modal
        isOpen={isImportModalOpen}
        currentData={data}
        targetTab="ec"
        onClose={() => setIsImportModalOpen(false)}
        onConfirmImport={handleImport020502}
      />

      <ImportPrecosModal
        isOpen={isImportPrecosModalOpen}
        currentData={data}
        onClose={() => setIsImportPrecosModalOpen(false)}
        onConfirmImport={handleImportPrecos}
      />

      <LogsModal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
      />

      <Modal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      <SalvarDifModal
        isOpen={isSalvarDifModalOpen}
        onClose={() => setIsSalvarDifModalOpen(false)}
        onConfirmSave={handleConfirmSaveDif}
        calculated={calculatedProducts}
        xs={data.xs}
        desativados={data.desativados}
      />
      
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onConfirm={() => protectedAction && protectedAction()}
        title="Autenticação Necessária"
      />
    </div>
  );
}
