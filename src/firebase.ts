import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { RawData, ContagemEstoqueItem } from './data/types';

export const firebaseConfig = {
  apiKey: "AIzaSyCNeRWfV7L-i3X1GBegzETsEbpGkmK_s4g",
  authDomain: "banco-03-6b1ea.firebaseapp.com",
  projectId: "banco-03-6b1ea",
  storageBucket: "banco-03-6b1ea.firebasestorage.app",
  messagingSenderId: "645365828863",
  appId: "1:645365828863:web:beb28f8f10226a02e210ca"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Identificador único da sessão do cliente para evitar loops de eco em tempo real
export const CLIENT_SESSION_ID =
  'cli_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);

const STATE_COLLECTION = 'estoque_guarabira';
const MAIN_DOC = 'estado_atual';
const EC_DOC = 'estoque_central';
const CONTAGENS_DOC = 'contagens_estoque';
const LOGS_COLLECTION = 'historico_acoes';

export interface ActionLog {
  id?: string;
  action: string;
  timestamp?: any;
  dateStr: string;
  details?: string;
}

// Estado interno da fila de salvamento no Firestore
let isSaving = false;
let saveDebounceTimer: any = null;
let lastKnownTotalChunks = 1;
let lastSavedEcHash = '';
let currentBackoffMs = 0;

interface QueuedSaveRequest {
  data: RawData;
  actionName?: string;
  details?: string;
  resolve: (value: boolean) => void;
}

let pendingSaveRequest: QueuedSaveRequest | null = null;

/**
 * Salva o estado completo no Firestore com fila serializada, debounce inteligente
 * e retry com exponential backoff para evitar erros de limite de banda (resource-exhausted).
 */
export function saveStateToFirestore(
  data: RawData,
  actionName?: string,
  details?: string,
  immediate: boolean = false
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    // Atualiza a requisição pendente com o dado mais recente
    pendingSaveRequest = { data, actionName, details, resolve };

    if (immediate) {
      if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
        saveDebounceTimer = null;
      }
      processSaveQueue();
    } else {
      // Debounce de 1200ms para agrupar alterações rápidas e evitar estouro de requisições
      if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
      }
      saveDebounceTimer = setTimeout(() => {
        saveDebounceTimer = null;
        processSaveQueue();
      }, 1200);
    }
  });
}

/**
 * Processador serializado da fila de salvamento
 */
async function processSaveQueue() {
  if (isSaving || !pendingSaveRequest) {
    return;
  }

  isSaving = true;
  const currentReq = pendingSaveRequest;
  pendingSaveRequest = null;

  try {
    const success = await executeSaveWithBackoff(currentReq.data, currentReq.actionName, currentReq.details);
    currentReq.resolve(success);
  } catch (err) {
    console.warn('[Firestore] Falha ao processar salvamento:', err);
    currentReq.resolve(false);
  } finally {
    isSaving = false;
    // Se novas alterações chegaram enquanto este salvamento ocorria, processa a próxima
    if (pendingSaveRequest) {
      setTimeout(processSaveQueue, currentBackoffMs > 0 ? currentBackoffMs : 200);
    }
  }
}

/**
 * Executa as escritas no Firestore aplicando retry com exponential backoff em caso de resource-exhausted
 */
async function executeSaveWithBackoff(
  data: RawData,
  actionName?: string,
  details?: string,
  maxRetries: number = 3
): Promise<boolean> {
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      if (currentBackoffMs > 0) {
        await new Promise((r) => setTimeout(r, currentBackoffMs));
      }

      const mainDocRef = doc(db, STATE_COLLECTION, MAIN_DOC);
      const ecDocRef = doc(db, STATE_COLLECTION, EC_DOC);
      const contagensDocRef = doc(db, STATE_COLLECTION, CONTAGENS_DOC);

      // Serializa o payload principal
      const fullPayload = JSON.stringify({
        xs: data.xs,
        res: data.res,
        gradeRes: data.gradeRes,
        aj: data.aj,
        dia: data.dia,
        men: data.men,
        recontagens: data.recontagens,
        desativados: data.desativados,
        dashboardSnapshots: data.dashboardSnapshots,
        ec0304: data.ec0304,
        gradeEc: data.gradeEc,
        contagem021101: data.contagem021101,
        contagensEstoque: data.contagensEstoque || [],
      });

      const CHUNK_SIZE = 700000;
      const numChunks = Math.max(1, Math.ceil(fullPayload.length / CHUNK_SIZE));

      // 1. Salva cada chunk necessário
      for (let i = 0; i < numChunks; i++) {
        const chunkDocRef = doc(db, STATE_COLLECTION, `${MAIN_DOC}_part_${i}`);
        await setDoc(chunkDocRef, {
          payload: fullPayload.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
          index: i,
          totalChunks: numChunks,
          updatedAt: serverTimestamp(),
          updatedAtStr: new Date().toISOString(),
        });
      }

      // 2. Limpa SOMENTE chunks que realmente existiam no salvamento anterior e deixaram de existir
      if (lastKnownTotalChunks > numChunks) {
        for (let i = numChunks; i < lastKnownTotalChunks; i++) {
          try {
            const excessDocRef = doc(db, STATE_COLLECTION, `${MAIN_DOC}_part_${i}`);
            await setDoc(excessDocRef, { payload: '', totalChunks: 0, exists: false });
          } catch {}
        }
      }
      lastKnownTotalChunks = numChunks;

      // 3. Salva contagens_estoque para broadcast leve instantâneo
      await setDoc(contagensDocRef, {
        items: data.contagensEstoque || [],
        clientSessionId: CLIENT_SESSION_ID,
        updatedAt: serverTimestamp(),
        updatedAtStr: new Date().toISOString(),
        actionName: actionName || 'atualizou_contagens',
      });

      // 4. Atualiza o documento de controle principal
      await setDoc(mainDocRef, {
        totalChunks: numChunks,
        chunkSize: CHUNK_SIZE,
        payloadLength: fullPayload.length,
        clientSessionId: CLIENT_SESSION_ID,
        updatedAt: serverTimestamp(),
        updatedAtStr: new Date().toISOString(),
        actionName: actionName || '',
        version: 2,
      });

      // 5. Salva o estoque central apenas quando houver alteração real nele (economiza banda)
      if (data.ec) {
        const ecStr = JSON.stringify(data.ec);
        const ecHash = `${data.ec.r?.length || 0}_${ecStr.length}`;
        if (ecHash !== lastSavedEcHash) {
          await setDoc(ecDocRef, {
            payload: ecStr,
            clientSessionId: CLIENT_SESSION_ID,
            updatedAt: serverTimestamp(),
            updatedAtStr: new Date().toISOString(),
          });
          lastSavedEcHash = ecHash;
        }
      }

      // 6. Registra no histórico apenas ações relevantes com nome
      if (actionName && !actionName.startsWith('Alterou')) {
        await logActionToFirestore(actionName, details);
      }

      // Sucesso: zera o backoff
      currentBackoffMs = 0;
      return true;
    } catch (error: any) {
      const errStr = String(error?.code || '') + ' ' + String(error?.message || '');
      const isBandwidthExhausted =
        errStr.includes('resource-exhausted') ||
        errStr.includes('bandwidth') ||
        error?.code === 'resource-exhausted';

      if (isBandwidthExhausted && attempt < maxRetries) {
        attempt++;
        currentBackoffMs = Math.min(30000, currentBackoffMs ? currentBackoffMs * 2 : 2500);
        console.warn(
          `[Firestore] Limite de banda do banco atingido (resource-exhausted). Aguardando backoff de ${currentBackoffMs}ms antes de tentar novamente (tentativa ${attempt}/${maxRetries})...`
        );
      } else {
        console.warn('[Firestore] Erro temporário ao salvar (dados preservados com segurança localmente):', error?.message || error);
        return false;
      }
    }
  }

  return false;
}

/**
 * Registra uma ação no histórico do Firestore
 */
export async function logActionToFirestore(action: string, details?: string): Promise<void> {
  try {
    const logsRef = collection(db, LOGS_COLLECTION);
    await addDoc(logsRef, {
      action,
      details: details || '',
      timestamp: serverTimestamp(),
      dateStr: new Date().toLocaleString('pt-BR'),
    });
  } catch (error) {
    console.error('Erro ao registrar log no Firestore:', error);
  }
}

/**
 * Carrega o estado salvo do Firestore com recuperação resiliente
 */
export async function loadStateFromFirestore(): Promise<RawData | null> {
  try {
    const mainDocRef = doc(db, STATE_COLLECTION, MAIN_DOC);
    const ecDocRef = doc(db, STATE_COLLECTION, EC_DOC);
    const contagensDocRef = doc(db, STATE_COLLECTION, CONTAGENS_DOC);

    const [mainSnap, ecSnap, contagensSnap] = await Promise.all([
      getDoc(mainDocRef),
      getDoc(ecDocRef),
      getDoc(contagensDocRef).catch(() => null),
    ]);

    if (!mainSnap.exists()) {
      return null;
    }

    const mainData = mainSnap.data();
    const totalChunks = mainData?.totalChunks || 1;

    // Busca todos os chunks em paralelo
    const chunkPromises = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunkDocRef = doc(db, STATE_COLLECTION, `${MAIN_DOC}_part_${i}`);
      chunkPromises.push(getDoc(chunkDocRef));
    }
    const chunkSnaps = await Promise.all(chunkPromises);

    let fullPayload = '';
    for (const snap of chunkSnaps) {
      if (snap.exists() && snap.data().payload) {
        fullPayload += snap.data().payload;
      }
    }

    let parsedMain: any = null;

    if (fullPayload) {
      try {
        parsedMain = JSON.parse(fullPayload);
      } catch (parseErr) {
        console.warn('Tentativa de reparo de junção no JSON do Firestore...', parseErr);
        try {
          const repaired = fullPayload.replace(/",01",/g, '"],["01",');
          parsedMain = JSON.parse(repaired);
        } catch {
          if (mainData.payload) {
            try {
              parsedMain = JSON.parse(mainData.payload);
            } catch {}
          }
        }
      }
    } else if (mainData.payload) {
      try {
        parsedMain = JSON.parse(mainData.payload);
      } catch {}
    }

    if (!parsedMain) {
      console.warn('Nenhum payload de estado válido encontrado no Firestore.');
      return null;
    }

    let parsedEc: any = undefined;
    if (ecSnap.exists()) {
      const ecDoc = ecSnap.data();
      if (ecDoc.payload) {
        try {
          parsedEc = JSON.parse(ecDoc.payload);
        } catch (e) {
          console.warn('Erro ao parsear ecDoc payload:', e);
        }
      } else if (ecDoc.ec) {
        parsedEc = ecDoc.ec;
      }
    }

    // Carrega contagens de estoque (prioriza o documento direto se existir)
    let parsedContagens: ContagemEstoqueItem[] = parsedMain.contagensEstoque || [];
    if (contagensSnap && contagensSnap.exists()) {
      const cData = contagensSnap.data();
      if (Array.isArray(cData?.items) && cData.items.length > 0) {
        parsedContagens = cData.items;
      }
    }

    return {
      xs: parsedMain.xs || [],
      res: parsedMain.res || [],
      gradeRes: parsedMain.gradeRes,
      aj: parsedMain.aj || { av: [], so: [], rp: [], fm: [] },
      dia: parsedMain.dia || [],
      men: parsedMain.men || [],
      ec: parsedEc || { h: [], r: [] },
      gradeEc: parsedMain.gradeEc,
      ec0304: parsedMain.ec0304,
      recontagens: parsedMain.recontagens || [],
      desativados: parsedMain.desativados || [],
      dashboardSnapshots: parsedMain.dashboardSnapshots || [],
      contagem021101: parsedMain.contagem021101 || { counts: [] },
      contagensEstoque: parsedContagens,
    };
  } catch (error) {
    console.error('Erro ao carregar do Firestore:', error);
    return null;
  }
}

/**
 * Escuta atualizações em tempo real do estado (Firestore onSnapshot)
 * Permite que múltiplos usuários no celular ou PC vejam alterações 100% em tempo real
 */
export function subscribeToState(
  onFullStateUpdate: (data: RawData, actionName?: string) => void,
  onContagensUpdate?: (items: ContagemEstoqueItem[], actionName?: string) => void
): () => void {
  const mainDocRef = doc(db, STATE_COLLECTION, MAIN_DOC);
  const contagensDocRef = doc(db, STATE_COLLECTION, CONTAGENS_DOC);

  let isFirstMain = true;
  let isFirstContagens = true;

  // Escuta o documento principal do estado (tabelas, ajustes, preços, snapshots)
  const unsubMain = onSnapshot(
    mainDocRef,
    async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      // Ignora o snapshot inicial e escritas feitas pela própria sessão
      if (isFirstMain) {
        isFirstMain = false;
        return;
      }
      if (data?.clientSessionId === CLIENT_SESSION_ID) {
        return;
      }

      try {
        const remote = await loadStateFromFirestore();
        if (remote) {
          onFullStateUpdate(remote, data?.actionName);
        }
      } catch (e) {
        console.warn('Erro ao atualizar estado remoto via snapshot:', e);
      }
    },
    (error) => {
      console.error('Erro no listener realtime do Firestore (main):', error);
    }
  );

  // Escuta contagens de estoque em tempo real direto (resposta imediata em <500ms)
  const unsubContagens = onSnapshot(
    contagensDocRef,
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      if (isFirstContagens) {
        isFirstContagens = false;
        return;
      }
      if (data?.clientSessionId === CLIENT_SESSION_ID) {
        return;
      }

      if (Array.isArray(data?.items) && onContagensUpdate) {
        onContagensUpdate(data.items, data?.actionName);
      }
    },
    (error) => {
      console.error('Erro no listener realtime do Firestore (contagens):', error);
    }
  );

  return () => {
    unsubMain();
    unsubContagens();
  };
}

/**
 * Salva e sincroniza os Pop-ups salvos de auditoria exclusivamente no Firebase Firestore
 */
export async function savePopupsToFirestore(popups: any[]): Promise<void> {
  try {
    const popupsDocRef = doc(db, STATE_COLLECTION, 'popups_salvos');
    await setDoc(popupsDocRef, {
      items: popups,
      updatedAt: serverTimestamp(),
      updatedAtStr: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[Firestore] Erro ao salvar popups no Firebase:', e);
  }
}

/**
 * Carrega os Pop-ups salvos do Firebase Firestore
 */
export async function loadPopupsFromFirestore(): Promise<any[]> {
  try {
    const popupsDocRef = doc(db, STATE_COLLECTION, 'popups_salvos');
    const snap = await getDoc(popupsDocRef);
    if (snap.exists() && Array.isArray(snap.data()?.items)) {
      return snap.data().items;
    }
  } catch (e) {
    console.warn('[Firestore] Erro ao carregar popups do Firebase:', e);
  }
  return [];
}

/**
 * Salva a conferência de grade exclusivamente no Firebase Firestore
 */
export async function saveGradeCheckToFirestore(cacheData: any): Promise<void> {
  try {
    const gradeCheckDocRef = doc(db, STATE_COLLECTION, 'grade_lancada_cache');
    await setDoc(gradeCheckDocRef, {
      data: cacheData,
      updatedAt: serverTimestamp(),
      updatedAtStr: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[Firestore] Erro ao salvar conferência de grade no Firebase:', e);
  }
}

/**
 * Carrega a conferência de grade do Firebase Firestore
 */
export async function loadGradeCheckFromFirestore(): Promise<any | null> {
  try {
    const gradeCheckDocRef = doc(db, STATE_COLLECTION, 'grade_lancada_cache');
    const snap = await getDoc(gradeCheckDocRef);
    if (snap.exists() && snap.data()?.data) {
      return snap.data().data;
    }
  } catch (e) {
    console.warn('[Firestore] Erro ao carregar conferência de grade do Firebase:', e);
  }
  return null;
}

/**
 * Salva a data do lembrete diário de devolução no Firebase Firestore
 */
export async function saveDevolucaoReminderDate(dateStr: string): Promise<void> {
  try {
    const configDocRef = doc(db, STATE_COLLECTION, 'configuracoes_sistema');
    await setDoc(configDocRef, { devolucaoReminderDate: dateStr, updatedAtStr: new Date().toISOString() }, { merge: true });
  } catch (e) {
    console.warn('[Firestore] Erro ao salvar lembrete no Firebase:', e);
  }
}

/**
 * Carrega a data do lembrete diário de devolução do Firebase Firestore
 */
export async function loadDevolucaoReminderDate(): Promise<string | null> {
  try {
    const configDocRef = doc(db, STATE_COLLECTION, 'configuracoes_sistema');
    const snap = await getDoc(configDocRef);
    if (snap.exists() && snap.data()?.devolucaoReminderDate) {
      return snap.data().devolucaoReminderDate;
    }
  } catch (e) {
    console.warn('[Firestore] Erro ao carregar lembrete do Firebase:', e);
  }
  return null;
}
