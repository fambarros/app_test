// Banco de dados
class ClientesDB {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ClientesDB', 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Criar tabela de clientes
        if (!db.objectStoreNames.contains('clientes')) {
          const clientesStore = db.createObjectStore('clientes', { keyPath: 'id', autoIncrement: true });
          clientesStore.createIndex('nome', 'nome', { unique: false });
          clientesStore.createIndex('telefone', 'telefone', { unique: false });
        }

        // Criar tabela de agendamentos
        if (!db.objectStoreNames.contains('agendamentos')) {
          const agendamentosStore = db.createObjectStore('agendamentos', { keyPath: 'id', autoIncrement: true });
          agendamentosStore.createIndex('clienteId', 'clienteId', { unique: false });
          agendamentosStore.createIndex('data', 'data', { unique: false });
          agendamentosStore.createIndex('concluido', 'concluido', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.isInitialized = true;
        resolve();
      };

      request.onerror = (event) => {
        console.error('Erro ao abrir banco de dados:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async addCliente(cliente) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['clientes'], 'readwrite');
      const store = transaction.objectStore('clientes');
      const request = store.add(cliente);

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async getClientes() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['clientes'], 'readonly');
      const store = transaction.objectStore('clientes');
      const request = store.getAll();

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async addAgendamento(agendamento) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['agendamentos'], 'readwrite');
      const store = transaction.objectStore('agendamentos');
      const request = store.add(agendamento);

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async getAgendamentosFuturos() {
    await this.init();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['agendamentos'], 'readonly');
      const store = transaction.objectStore('agendamentos');
      const request = store.getAll();

      request.onsuccess = (event) => {
        const agendamentos = event.target.result;
        const futuros = agendamentos.filter(a => {
          const dataAgendamento = new Date(a.data);
          return dataAgendamento >= hoje && !a.concluido;
        }).sort((a, b) => {
          const dataA = new Date(a.data + 'T' + a.horaInicio);
          const dataB = new Date(b.data + 'T' + b.horaInicio);
          return dataA - dataB;
        });
        resolve(futuros);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async getAgendamentosHistorico() {
    await this.init();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['agendamentos'], 'readonly');
      const store = transaction.objectStore('agendamentos');
      const request = store.getAll();

      request.onsuccess = (event) => {
        const agendamentos = event.target.result;
        const historico = agendamentos.filter(a => {
          const dataAgendamento = new Date(a.data);
          return dataAgendamento < hoje || a.concluido;
        }).sort((a, b) => {
          const dataA = new Date(a.data + 'T' + a.horaInicio);
          const dataB = new Date(b.data + 'T' + b.horaInicio);
          return dataB - dataA; // Ordem decrescente
        });
        resolve(historico);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async getAgendamentosHoje() {
    await this.init();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['agendamentos'], 'readonly');
      const store = transaction.objectStore('agendamentos');
      const request = store.getAll();

      request.onsuccess = (event) => {
        const agendamentos = event.target.result;
        const agendamentosHoje = agendamentos.filter(a => {
          const dataAgendamento = new Date(a.data);
          return dataAgendamento >= hoje && dataAgendamento < amanha;
        }).sort((a, b) => {
          const horaA = a.horaInicio;
          const horaB = b.horaInicio;
          return horaA.localeCompare(horaB);
        });
        resolve(agendamentosHoje);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async marcarComoConcluido(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['agendamentos'], 'readwrite');
      const store = transaction.objectStore('agendamentos');
      const request = store.get(id);

      request.onsuccess = (event) => {
        const agendamento = event.target.result;
        if (agendamento) {
          agendamento.concluido = true;
          const updateRequest = store.put(agendamento);
          updateRequest.onsuccess = () => {
            resolve(true);
          };
          updateRequest.onerror = (error) => {
            reject(error);
          };
        } else {
          reject(new Error('Agendamento não encontrado'));
        }
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async excluirAgendamento(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['agendamentos'], 'readwrite');
      const store = transaction.objectStore('agendamentos');
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async getAgendamento(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['agendamentos'], 'readonly');
      const store = transaction.objectStore('agendamentos');
      const request = store.get(id);

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async atualizarAgendamento(agendamento) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['agendamentos'], 'readwrite');
      const store = transaction.objectStore('agendamentos');
      const request = store.put(agendamento);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async getAgendamentosPorMesAno(mes, ano) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['agendamentos'], 'readonly');
      const store = transaction.objectStore('agendamentos');
      const request = store.getAll();

      request.onsuccess = (event) => {
        const agendamentos = event.target.result;
        const filtrados = agendamentos.filter(a => {
          const data = new Date(a.data);
          return data.getMonth() === parseInt(mes) && data.getFullYear() === parseInt(ano) && a.concluido;
        });
        resolve(filtrados);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async exportarBackup() {
    await this.init();
    const clientes = await this.getClientes();
    const agendamentos = await this.getAllAgendamentos();

    const backup = {
      clientes,
      agendamentos,
      dataBackup: new Date().toISOString()
    };

    return JSON.stringify(backup);
  }

  async importarBackup(backupStr) {
    try {
      const backup = JSON.parse(backupStr);
      await this.init();

      // Limpar banco de dados atual
      await this.limparBancoDados();

      // Importar clientes
      for (const cliente of backup.clientes) {
        await this.addCliente(cliente);
      }

      // Importar agendamentos
      for (const agendamento of backup.agendamentos) {
        await this.addAgendamento(agendamento);
      }

      return true;
    } catch (error) {
      console.error('Erro ao importar backup:', error);
      return false;
    }
  }

  async getAllAgendamentos() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['agendamentos'], 'readonly');
      const store = transaction.objectStore('agendamentos');
      const request = store.getAll();

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async limparBancoDados() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['clientes', 'agendamentos'], 'readwrite');
      const clientesStore = transaction.objectStore('clientes');
      const agendamentosStore = transaction.objectStore('agendamentos');

      const clearClientes = clientesStore.clear();
      const clearAgendamentos = agendamentosStore.clear();

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
}

// Inicialização do aplicativo
document.addEventListener('DOMContentLoaded', () => {
  const db = new ClientesDB();
  
  // Elementos da UI
  const menuBtn = document.getElementById('menu-btn');
  const sidebar = document.getElementById('sidebar');
  const closeSidebarBtn = document.getElementById('close-sidebar');
  const modalOverlay = document.getElementById('modal-overlay');
  const addAppointmentBtn = document.getElementById('add-appointment-btn');
  const appointmentModal = document.getElementById('appointment-modal');
  const closeModalBtns = document.querySelectorAll('.close-modal, .cancel-modal');
  const appointmentForm = document.getElementById('appointment-form');
  const appointmentsList = document.getElementById('appointments-list');
  
  // Links de navegação
  const dashboardLink = document.getElementById('dashboard-link');
  const dailyViewLink = document.getElementById('daily-view-link');
  const accountingLink = document.getElementById('accounting-link');
  const historyLink = document.getElementById('history-link');
  const settingsLink = document.getElementById('settings-link');
  
  // Páginas
  const dashboardPage = document.getElementById('dashboard-page');
  const dailyViewPage = document.getElementById('daily-view-page');
  const accountingPage = document.getElementById('accounting-page');
  const historyPage = document.getElementById('history-page');
  const settingsPage = document.getElementById('settings-page');
  
  // Botões de configurações
  const backupBtn = document.getElementById('backup-btn');
  const restoreBtn = document.getElementById('restore-btn');
  
  // Botões de exportação
  const exportBtn = document.getElementById('export-btn');
  const exportModal = document.getElementById('export-modal');
  const exportPdfBtn = document.getElementById('export-pdf');
  const exportCsvBtn = document.getElementById('export-csv');

  // Elementos de contabilidade
  const accountingMonth = document.getElementById('accounting-month');
  const accountingYear = document.getElementById('accounting-year');
  const discountPercentage = document.getElementById('discount-percentage');
  const calculateAccountingBtn = document.getElementById('calculate-accounting');
  const accountingResults = document.getElementById('accounting-results');
  
  // Inicializar banco de dados
  db.init().then(() => {
    carregarAgendamentos();
    preencherAnosContabilidade();
  }).catch(error => {
    console.error('Erro ao inicializar banco de dados:', error);
  });
  
  // Funções de navegação
  function mostrarPagina(pagina) {
    // Esconder todas as páginas
    dashboardPage.classList.remove('active');
    dailyViewPage.classList.remove('active');
    accountingPage.classList.remove('active');
    historyPage.classList.remove('active');
    settingsPage.classList.remove('active');
    
    // Remover classe ativa de todos os links
    dashboardLink.classList.remove('active');
    dailyViewLink.classList.remove('active');
    accountingLink.classList.remove('active');
    historyLink.classList.remove('active');
    settingsLink.classList.remove('active');
    
    // Mostrar página selecionada
    if (pagina === 'dashboard') {
      dashboardPage.classList.add('active');
      dashboardLink.classList.add('active');
      carregarAgendamentos();
    } else if (pagina === 'daily-view') {
      dailyViewPage.classList.add('active');
      dailyViewLink.classList.add('active');
      carregarClientesDoDia();
    } else if (pagina === 'accounting') {
      accountingPage.classList.add('active');
      accountingLink.classList.add('active');
    } else if (pagina === 'history') {
      historyPage.classList.add('active');
      historyLink.classList.add('active');
      carregarHistorico();
    } else if (pagina === 'settings') {
      settingsPage.classList.add('active');
      settingsLink.classList.add('active');
    }
    
    // Fechar sidebar em dispositivos móveis
    sidebar.classList.add('hidden');
    modalOverlay.style.display = 'none'; // CORREÇÃO: Esconder overlay ao mudar de página
  }
  
  // Carregar agendamentos na dashboard
  async function carregarAgendamentos() {
    try {
      const agendamentos = await db.getAgendamentosFuturos();
      
      if (agendamentos.length === 0) {
        appointmentsList.innerHTML = '<p class="empty-message">Nenhum agendamento encontrado. Adicione seu primeiro agendamento!</p>';
        return;
      }
      
      let html = '';
      for (const agendamento of agendamentos) {
        const data = new Date(agendamento.data);
        const dataFormatada = data.toLocaleDateString('pt-BR');
        
        html += `
          <div class="appointment-item">
            <div class="appointment-header">
              <h3>${agendamento.nomeCliente}</h3>
              <span class="appointment-date">${dataFormatada}</span>
            </div>
            <div class="appointment-details">
              <p><strong>Horário:</strong> ${agendamento.horaInicio} - ${agendamento.horaFim}</p>
              ${agendamento.telefone ? `<p><strong>Telefone:</strong> ${agendamento.telefone}</p>` : ''}
              ${agendamento.valor ? `<p><strong>Valor:</strong> € ${agendamento.valor.toFixed(2)}</p>` : ''}
              ${agendamento.observacao ? `<p><strong>Observação:</strong> ${agendamento.observacao}</p>` : ''}
            </div>
            <div class="appointment-actions">
              <button class="btn-complete" data-id="${agendamento.id}">✓</button>
              <button class="btn-edit" data-id="${agendamento.id}">✎</button>
              <button class="btn-delete" data-id="${agendamento.id}">✕</button>
            </div>
          </div>
        `;
      }
      
      appointmentsList.innerHTML = html;
      
      // Adicionar event listeners para os botões (com suporte a touch)
      document.querySelectorAll('.btn-complete').forEach(btn => {
        // Adicionar eventos de clique e touch
        ['click', 'touchstart'].forEach(eventType => {
          btn.addEventListener(eventType, (e) => {
            e.preventDefault(); // Prevenir comportamento padrão para touch
            if (eventType === 'touchstart') {
              // Evitar que o evento de clique também seja disparado
              e.stopPropagation();
            }
            const id = parseInt(e.target.dataset.id);
            marcarComoConcluido(id);
          });
        });
      });
      
      document.querySelectorAll('.btn-edit').forEach(btn => {
        // Adicionar eventos de clique e touch
        ['click', 'touchstart'].forEach(eventType => {
          btn.addEventListener(eventType, (e) => {
            e.preventDefault(); // Prevenir comportamento padrão para touch
            if (eventType === 'touchstart') {
              // Evitar que o evento de clique também seja disparado
              e.stopPropagation();
            }
            const id = parseInt(e.target.dataset.id);
            editarAgendamento(id);
          });
        });
      });
      
      document.querySelectorAll('.btn-delete').forEach(btn => {
        // Adicionar eventos de clique e touch
        ['click', 'touchstart'].forEach(eventType => {
          btn.addEventListener(eventType, (e) => {
            e.preventDefault(); // Prevenir comportamento padrão para touch
            if (eventType === 'touchstart') {
              // Evitar que o evento de clique também seja disparado
              e.stopPropagation();
            }
            const id = parseInt(e.target.dataset.id);
            excluirAgendamento(id);
          });
        });
      });
      
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      appointmentsList.innerHTML = '<p class="empty-message">Erro ao carregar agendamentos. Tente novamente.</p>';
    }
  }

  // Carregar clientes do dia
  async function carregarClientesDoDia() {
    try {
      const agendamentos = await db.getAgendamentosHoje();
      const dailyClientsList = document.getElementById('daily-clients-list');
      
      if (agendamentos.length === 0) {
        dailyClientsList.innerHTML = '<p class="empty-message">Nenhum cliente agendado para hoje.</p>';
        return;
      }
      
      let html = '';
      for (const agendamento of agendamentos) {
        html += `
          <div class="daily-client-item">
            <div class="daily-client-name">${agendamento.nomeCliente}</div>
            <div class="daily-client-time">${agendamento.horaInicio} - ${agendamento.horaFim}</div>
            <div class="daily-client-status">${agendamento.concluido ? 'Concluído' : 'Pendente'}</div>
          </div>
        `;
      }
      
      dailyClientsList.innerHTML = html;
    } catch (error) {
      console.error('Erro ao carregar clientes do dia:', error);
      document.getElementById('daily-clients-list').innerHTML = '<p class="empty-message">Erro ao carregar clientes do dia. Tente novamente.</p>';
    }
  }
  
  // Marcar agendamento como concluído
  async function marcarComoConcluido(id) {
    try {
      await db.marcarComoConcluido(id);
      carregarAgendamentos();
    } catch (error) {
      console.error('Erro ao marcar agendamento como concluído:', error);
      alert('Erro ao marcar agendamento como concluído. Tente novamente.');
    }
  }
  
  // Excluir agendamento
  async function excluirAgendamento(id) {
    if (confirm('Tem certeza que deseja excluir este agendamento?')) {
      try {
        await db.excluirAgendamento(id);
        carregarAgendamentos();
      } catch (error) {
        console.error('Erro ao excluir agendamento:', error);
        alert('Erro ao excluir agendamento. Tente novamente.');
      }
    }
  }
  
  // Editar agendamento
  async function editarAgendamento(id) {
    try {
      const agendamento = await db.getAgendamento(id);
      
      if (!agendamento) {
        alert('Agendamento não encontrado.');
        return;
      }
      
      // Preencher formulário com dados do agendamento
      document.getElementById('client-name').value = agendamento.nomeCliente;
      document.getElementById('client-observation').value = agendamento.observacao || '';
      document.getElementById('client-phone').value = agendamento.telefone || '';
      document.getElementById('appointment-date').value = agendamento.data;
      document.getElementById('start-time').value = agendamento.horaInicio;
      document.getElementById('end-time').value = agendamento.horaFim;
      document.getElementById('service-value').value = agendamento.valor || '';
      document.getElementById('notify').checked = agendamento.notificar;
      
      // Modificar o formulário para edição
      const form = document.getElementById('appointment-form');
      form.dataset.mode = 'edit';
      form.dataset.id = id;
      
      // Mostrar modal
      appointmentModal.style.display = 'block';
      modalOverlay.style.display = 'block';
      
    } catch (error) {
      console.error('Erro ao editar agendamento:', error);
      alert('Erro ao editar agendamento. Tente novamente.');
    }
  }
  
  // Carregar histórico
  async function carregarHistorico() {
    try {
      const historico = await db.getAgendamentosHistorico();
      const historyList = document.getElementById('history-list');
      
      if (historico.length === 0) {
        historyList.innerHTML = '<p class="empty-message">Nenhum histórico encontrado.</p>';
        return;
      }
      
      let html = '';
      for (const agendamento of historico) {
        const data = new Date(agendamento.data);
        const dataFormatada = data.toLocaleDateString('pt-BR');
        
        html += `
          <div class="history-item">
            <div class="history-header">
              <h3>${agendamento.nomeCliente}</h3>
              <span class="history-date">${dataFormatada}</span>
            </div>
            <div class="history-details">
              <p><strong>Horário:</strong> ${agendamento.horaInicio} - ${agendamento.horaFim}</p>
              ${agendamento.telefone ? `<p><strong>Telefone:</strong> ${agendamento.telefone}</p>` : ''}
              ${agendamento.valor ? `<p><strong>Valor:</strong> € ${agendamento.valor.toFixed(2)}</p>` : ''}
              <p><strong>Status:</strong> ${agendamento.concluido ? 'Concluído' : 'Cancelado'}</p>
            </div>
          </div>
        `;
      }
      
      historyList.innerHTML = html;
      
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      document.getElementById('history-list').innerHTML = '<p class="empty-message">Erro ao carregar histórico. Tente novamente.</p>';
    }
  }

  // Preencher anos para contabilidade
  function preencherAnosContabilidade() {
    const anoAtual = new Date().getFullYear();
    const selectAno = document.getElementById('accounting-year');
    
    // Adicionar últimos 5 anos
    for (let i = 0; i < 5; i++) {
      const ano = anoAtual - i;
      const option = document.createElement('option');
      option.value = ano;
      option.textContent = ano;
      selectAno.appendChild(option);
    }

    // Definir mês atual como padrão
    const mesAtual = new Date().getMonth();
    document.getElementById('accounting-month').value = mesAtual;
  }

  // Calcular contabilidade
  async function calcularContabilidade() {
    try {
      const mes = document.getElementById('accounting-month').value;
      const ano = document.getElementById('accounting-year').value;
      const descontoPerc = parseFloat(document.getElementById('discount-percentage').value || 0);
      
      const agendamentos = await db.getAgendamentosPorMesAno(mes, ano);
      
      if (agendamentos.length === 0) {
        accountingResults.innerHTML = '<p class="empty-message">Nenhum atendimento concluído no período selecionado.</p>';
        return;
      }
      
      // Agrupar por semana
      const semanas = {};
      let totalMes = 0;
      
      agendamentos.forEach(agendamento => {
        if (!agendamento.valor) return;
        
        const data = new Date(agendamento.data);
        // Obter número da semana (0-indexed, primeira semana do mês é 0)
        const primeiroDia = new Date(data.getFullYear(), data.getMonth(), 1);
        const diferencaDias = Math.floor((data - primeiroDia) / (24 * 60 * 60 * 1000));
        const semana = Math.floor(diferencaDias / 7);
        
        if (!semanas[semana]) {
          semanas[semana] = {
            total: 0,
            agendamentos: []
          };
        }
        
        semanas[semana].total += agendamento.valor;
        semanas[semana].agendamentos.push(agendamento);
        totalMes += agendamento.valor;
      });
      
      // Calcular desconto
      const descontoMes = (totalMes * descontoPerc) / 100;
      const totalLiquido = totalMes - descontoMes;
      
      // Gerar HTML
      const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const nomeMes = meses[parseInt(mes)];
      
      let html = `
        <h3>Contabilidade: ${nomeMes} de ${ano}</h3>
        <div class="accounting-summary">
          <p><strong>Total do Mês:</strong> € ${totalMes.toFixed(2)}</p>
          ${descontoPerc > 0 ? `
            <p><strong>Desconto (${descontoPerc}%):</strong> € ${descontoMes.toFixed(2)}</p>
            <p><strong>Total Líquido:</strong> € ${totalLiquido.toFixed(2)}</p>
          ` : ''}
        </div>
        <div class="accounting-weeks">
      `;
      
      // Adicionar detalhes por semana
      Object.keys(semanas).sort((a, b) => parseInt(a) - parseInt(b)).forEach(semana => {
        const dadosSemana = semanas[semana];
        const descontoSemana = (dadosSemana.total * descontoPerc) / 100;
        const liquidoSemana = dadosSemana.total - descontoSemana;
        
        html += `
          <div class="accounting-week">
            <h4>Semana ${parseInt(semana) + 1}</h4>
            <p><strong>Total:</strong> € ${dadosSemana.total.toFixed(2)}</p>
            ${descontoPerc > 0 ? `
              <p><strong>Desconto (${descontoPerc}%):</strong> € ${descontoSemana.toFixed(2)}</p>
              <p><strong>Líquido:</strong> € ${liquidoSemana.toFixed(2)}</p>
            ` : ''}
          </div>
        `;
      });
      
      html += '</div>';
      accountingResults.innerHTML = html;
      
    } catch (error) {
      console.error('Erro ao calcular contabilidade:', error);
      accountingResults.innerHTML = '<p class="empty-message">Erro ao calcular contabilidade. Tente novamente.</p>';
    }
  }
  
  // Event listeners
  
  // Menu e navegação - com suporte a touch
  ['click', 'touchstart'].forEach(eventType => {
    menuBtn.addEventListener(eventType, (e) => {
      if (eventType === 'touchstart') {
        e.preventDefault();
        e.stopPropagation();
      }
      sidebar.classList.remove('hidden');
      modalOverlay.style.display = 'block';
      document.body.classList.add('sidebar-open');
      
      // Impedir que o overlay afete o menu lateral
      e.stopImmediatePropagation();
    });
    
    closeSidebarBtn.addEventListener(eventType, (e) => {
      if (eventType === 'touchstart') {
        e.preventDefault();
        e.stopPropagation();
      }
      sidebar.classList.add('hidden');
      modalOverlay.style.display = 'none';
      document.body.classList.remove('sidebar-open');
      
      // Impedir que o overlay afete o menu lateral
      e.stopImmediatePropagation();
    });
    
    // Fechar sidebar ao clicar/tocar no overlay
    modalOverlay.addEventListener(eventType, (e) => {
      if (eventType === 'touchstart') {
        e.preventDefault();
        e.stopPropagation();
      }
      
      // Verificar se o clique foi no overlay e não no sidebar
      if (e.target === modalOverlay) {
        sidebar.classList.add('hidden');
        appointmentModal.style.display = 'none';
        exportModal.style.display = 'none';
        modalOverlay.style.display = 'none';
        document.body.classList.remove('sidebar-open');
      }
    });
  });
  
  // Links de navegação com suporte a touch
  ['click', 'touchstart'].forEach(eventType => {
    dashboardLink.addEventListener(eventType, (e) => {
      e.preventDefault();
      if (eventType === 'touchstart') {
        e.stopPropagation();
      }
      mostrarPagina('dashboard');
    });
    
    dailyViewLink.addEventListener(eventType, (e) => {
      e.preventDefault();
      if (eventType === 'touchstart') {
        e.stopPropagation();
      }
      mostrarPagina('daily-view');
    });
    
    accountingLink.addEventListener(eventType, (e) => {
      e.preventDefault();
      if (eventType === 'touchstart') {
        e.stopPropagation();
      }
      mostrarPagina('accounting');
    });
    
    historyLink.addEventListener(eventType, (e) => {
      e.preventDefault();
      if (eventType === 'touchstart') {
        e.stopPropagation();
      }
      mostrarPagina('history');
    });
    
    settingsLink.addEventListener(eventType, (e) => {
      e.preventDefault();
      if (eventType === 'touchstart') {
        e.stopPropagation();
      }
      mostrarPagina('settings');
    });
  });
  
  // Modal de agendamento
  addAppointmentBtn.addEventListener('click', () => {
    // Limpar formulário
    appointmentForm.reset();
    appointmentForm.dataset.mode = 'add';
    delete appointmentForm.dataset.id;
    
    // Definir data mínima como hoje
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('appointment-date').min = hoje;
    
    // Mostrar modal
    appointmentModal.style.display = 'block';
    modalOverlay.style.display = 'block';
  });
  
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      appointmentModal.style.display = 'none';
      exportModal.style.display = 'none';
      modalOverlay.style.display = 'none';
    });
  });
  
  // Formulário de agendamento
  appointmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nomeCliente = document.getElementById('client-name').value;
    const observacao = document.getElementById('client-observation').value;
    const telefone = document.getElementById('client-phone').value;
    const data = document.getElementById('appointment-date').value;
    const horaInicio = document.getElementById('start-time').value;
    const horaFim = document.getElementById('end-time').value;
    const valorStr = document.getElementById('service-value').value;
    const valor = valorStr ? parseFloat(valorStr) : null;
    const notificar = document.getElementById('notify').checked;
    
    try {
      // Verificar se é edição ou novo agendamento
      const isEdit = appointmentForm.dataset.mode === 'edit';
      
      if (isEdit) {
        const id = parseInt(appointmentForm.dataset.id);
        const agendamento = await db.getAgendamento(id);
        
        if (agendamento) {
          agendamento.nomeCliente = nomeCliente;
          agendamento.observacao = observacao;
          agendamento.telefone = telefone;
          agendamento.data = data;
          agendamento.horaInicio = horaInicio;
          agendamento.horaFim = horaFim;
          agendamento.valor = valor;
          agendamento.notificar = notificar;
          
          await db.atualizarAgendamento(agendamento);
        }
      } else {
        // Verificar se o cliente já existe
        const clientes = await db.getClientes();
        let clienteId = null;
        
        const clienteExistente = clientes.find(c => c.nome.toLowerCase() === nomeCliente.toLowerCase());
        
        if (clienteExistente) {
          clienteId = clienteExistente.id;
        } else {
          // Adicionar novo cliente
          clienteId = await db.addCliente({
            nome: nomeCliente,
            telefone: telefone || ''
          });
        }
        
        // Adicionar agendamento
        await db.addAgendamento({
          clienteId,
          nomeCliente,
          observacao,
          telefone,
          data,
          horaInicio,
          horaFim,
          valor,
          notificar,
          concluido: false,
          dataCriacao: new Date().toISOString()
        });
      }
      
      // Fechar modal e atualizar lista
      appointmentModal.style.display = 'none';
      modalOverlay.style.display = 'none';
      carregarAgendamentos();
      
      // Agendar notificação se solicitado
      if (notificar) {
        agendarNotificacao(nomeCliente, data, horaInicio);
      }
      
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      alert('Erro ao salvar agendamento. Tente novamente.');
    }
  });
  
  // Exportação de histórico
  exportBtn.addEventListener('click', () => {
    exportModal.style.display = 'block';
    modalOverlay.style.display = 'block';
  });
  
  exportPdfBtn.addEventListener('click', async () => {
    try {
      const historico = await db.getAgendamentosHistorico();
      exportarPDF(historico);
      exportModal.style.display = 'none';
      modalOverlay.style.display = 'none';
    } catch (error) {
      console.error('Erro ao exportar histórico:', error);
      alert('Erro ao exportar histórico. Tente novamente.');
    }
  });
  
  exportCsvBtn.addEventListener('click', async () => {
    try {
      const historico = await db.getAgendamentosHistorico();
      exportarCSV(historico);
      exportModal.style.display = 'none';
      modalOverlay.style.display = 'none';
    } catch (error) {
      console.error('Erro ao exportar histórico:', error);
      alert('Erro ao exportar histórico. Tente novamente.');
    }
  });
  
  // Backup e restauração
  backupBtn.addEventListener('click', async () => {
    try {
      const backup = await db.exportarBackup();
      const blob = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `clientes_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Backup exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      alert('Erro ao exportar backup. Tente novamente.');
    }
  });
  
  restoreBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const backupStr = event.target.result;
          const sucesso = await db.importarBackup(backupStr);
          
          if (sucesso) {
            alert('Backup importado com sucesso!');
            carregarAgendamentos();
          } else {
            alert('Erro ao importar backup. Formato inválido.');
          }
        } catch (error) {
          console.error('Erro ao importar backup:', error);
          alert('Erro ao importar backup. Tente novamente.');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  });

  // Contabilidade
  calculateAccountingBtn.addEventListener('click', () => {
    calcularContabilidade();
  });
  
  // Funções auxiliares
  
  function agendarNotificacao(nomeCliente, data, hora) {
    if (!('Notification' in window)) {
      console.log('Este navegador não suporta notificações');
      return;
    }
    
    if (Notification.permission === 'granted') {
      criarNotificacao(nomeCliente, data, hora);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          criarNotificacao(nomeCliente, data, hora);
        }
      });
    }
  }
  
  function criarNotificacao(nomeCliente, data, hora) {
    const dataAgendamento = new Date(`${data}T${hora}`);
    const agora = new Date();
    
    // Se for hoje, notificar 30 minutos antes
    if (dataAgendamento.toDateString() === agora.toDateString()) {
      const tempoAteAgendamento = dataAgendamento.getTime() - agora.getTime();
      const tempoAteNotificacao = tempoAteAgendamento - (30 * 60 * 1000); // 30 minutos antes
      
      if (tempoAteNotificacao > 0) {
        setTimeout(() => {
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_NOTIFICATION',
              title: 'Lembrete de Agendamento',
              body: `Você tem um agendamento com ${nomeCliente} em 30 minutos!`,
              tag: `agendamento-${data}-${hora}`
            });
          }
        }, tempoAteNotificacao);
      }
    } 
    // Se for outro dia, notificar no dia anterior às 20h
    else {
      const diaAnterior = new Date(dataAgendamento);
      diaAnterior.setDate(diaAnterior.getDate() - 1);
      diaAnterior.setHours(20, 0, 0, 0);
      
      const tempoAteNotificacao = diaAnterior.getTime() - agora.getTime();
      
      if (tempoAteNotificacao > 0) {
        setTimeout(() => {
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_NOTIFICATION',
              title: 'Lembrete de Agendamento',
              body: `Você tem um agendamento com ${nomeCliente} amanhã às ${hora}!`,
              tag: `agendamento-${data}-${hora}`
            });
          }
        }, tempoAteNotificacao);
      }
    }
  }
  
  function exportarPDF(historico) {
    let html = `
      <html>
      <head>
        <title>Histórico de Atendimentos</title>
        <style>
          body { font-family: Arial, sans-serif; }
          h1 { color: #4285f4; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Histórico de Atendimentos</h1>
        <p>Data de exportação: ${new Date().toLocaleDateString('pt-BR')}</p>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Data</th>
              <th>Horário</th>
              <th>Telefone</th>
              <th>Valor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    for (const agendamento of historico) {
      const data = new Date(agendamento.data);
      const dataFormatada = data.toLocaleDateString('pt-BR');
      
      html += `
        <tr>
          <td>${agendamento.nomeCliente}</td>
          <td>${dataFormatada}</td>
          <td>${agendamento.horaInicio} - ${agendamento.horaFim}</td>
          <td>${agendamento.telefone || '-'}</td>
          <td>${agendamento.valor ? `€ ${agendamento.valor.toFixed(2)}` : '-'}</td>
          <td>${agendamento.concluido ? 'Concluído' : 'Cancelado'}</td>
        </tr>
      `;
    }
    
    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico_atendimentos_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  function exportarCSV(historico) {
    let csv = 'Cliente,Data,Horário,Telefone,Valor,Status\n';
    
    for (const agendamento of historico) {
      const data = new Date(agendamento.data);
      const dataFormatada = data.toLocaleDateString('pt-BR');
      const horario = `${agendamento.horaInicio} - ${agendamento.horaFim}`;
      const telefone = agendamento.telefone || '';
      const valor = agendamento.valor ? agendamento.valor.toFixed(2) : '';
      const status = agendamento.concluido ? 'Concluído' : 'Cancelado';
      
      csv += `"${agendamento.nomeCliente}","${dataFormatada}","${horario}","${telefone}","${valor}","${status}"\n`;
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico_atendimentos_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  // Inicializar a página
  mostrarPagina('dashboard');
});
