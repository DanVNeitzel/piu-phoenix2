// Local edition: no account or authentication requests.
function formatMilhar(value) { return Number(value || 0).toLocaleString('pt-BR'); }
function showChangelogModal() {
  // Verifica se o usuário marcou para não mostrar novamente
  const dontShow = localStorage.getItem('dontShowChangelog');
  
  if (dontShow === 'true') {
    return; // Não mostrar
  }

  // Carregar o changelog.json
  fetch('changelog.json?v=' + new Date().getTime())
    .then(response => response.json())
    .then(data => {
      renderChangelog(data);
      document.getElementById('changelogModal').style.display = 'block';
    })
    .catch(error => {
      console.error('Erro ao carregar changelog:', error);
    });
}

/**
 * Renderiza o conteúdo do changelog na modal
 */
function renderChangelog(data) {
  const content = document.getElementById('changelogContent');
  
  let html = `
    <div class="text-center mb-3">
      <h5 class="text-warning">Version ${data.version}</h5>
      <p class="text-white-50 small">${formatDate(data.date)}</p>
    </div>
  `;

  // Renderizar cada categoria de updates
  data.updates.forEach(category => {
    html += `
      <div class="mb-4">
        <h6 class="font-piu text-info mb-2">${category.category}</h6>
        <ul class="text-white" style="list-style: none; padding-left: 0;">
    `;
    
    category.items.forEach(item => {
      html += `<li style="margin-bottom: 8px;">• ${item}</li>`;
    });
    
    html += `
        </ul>
      </div>
    `;
  });

  // Adicionar notas se houver
  if (data.notes && data.notes.length > 0) {
    html += `
      <div class="mt-4 p-3" style="background: rgba(255, 193, 7, 0.1); border-left: 3px solid #ffc107; border-radius: 5px;">
        <h6 class="text-warning mb-2">📝 Important Notes</h6>
        <ul class="text-white-50 small" style="list-style: none; padding-left: 0; margin-bottom: 0;">
    `;
    
    data.notes.forEach(note => {
      html += `<li style="margin-bottom: 5px;">• ${note}</li>`;
    });
    
    html += `
        </ul>
      </div>
    `;
  }

  content.innerHTML = html;
}

/**
 * Fecha a modal de changelog e salva a preferência se marcada
 */
function closeChangelog() {
  const checkbox = document.getElementById('dontShowChangelogAgain');
  
  if (checkbox.checked) {
    localStorage.setItem('dontShowChangelog', 'true');
  }
  
  document.getElementById('changelogModal').style.display = 'none';
}

/**
 * Formata data para exibição
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

/**
 * Abre o changelog manualmente (ignora preferência de "não mostrar")
 * Usado quando o usuário clica no botão de changelog
 */
function openChangelog() {
  // Carregar o changelog.json
  fetch('changelog.json?v=' + new Date().getTime())
    .then(response => response.json())
    .then(data => {
      renderChangelog(data);
      
      // Fechar outros modais se estiverem abertos
      $('#loginWindow').modal('hide');
      $('#settingsMenu').modal('hide');
      
      // Abrir modal de changelog
      document.getElementById('changelogModal').style.display = 'block';
      
      // Desmarcar checkbox para permitir que apareça novamente no próximo login
      document.getElementById('dontShowChangelogAgain').checked = false;
    })
    .catch(error => {
      console.error('Erro ao carregar changelog:', error);
      alert('Erro ao carregar changelog. Tente novamente.');
    });
}