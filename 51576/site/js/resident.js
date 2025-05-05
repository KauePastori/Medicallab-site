const API_BASE_URL = window.API_BASE_URL || "http://localhost:4000/api";

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

let currentModule = "";
let currentActivityDate = "";
let precisionChart, timeChart, errorChart;

async function loadDatesFromAPI(email) {
  try {
    const res = await fetch(`${API_BASE_URL}/scores`);
    const data = await res.json();
    const dates = Array.from(
      new Set(
        data
          .filter(s => s.user?.email === email)
          .map(s => s.createdAt.slice(0, 10))
      )
    ).sort();

    const dateSelect = document.getElementById("activity-date-select");
    dateSelect.innerHTML = '<option value="">Selecione a data</option>';

    dates.forEach(date => {
      const option = document.createElement("option");
      option.value = date;
      option.textContent = new Date(date).toLocaleDateString("pt-BR");
      dateSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Erro ao carregar datas da API:", err);
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  const loggedInUser = localStorage.getItem("loggedInUser");
  const greetingElem = document.getElementById("greeting");
  if (loggedInUser) {
    const user = JSON.parse(loggedInUser);
    if (greetingElem && user.name) {
      greetingElem.textContent = "Olá " + user.name;
    }
    await loadDatesFromAPI(user.email);
  } else {
    if (greetingElem) {
      greetingElem.textContent = "Olá, visitante";
    }
  }
  loadFeedback();
});

function logout() {
  const logoutOverlay = document.getElementById("logout-overlay");
  logoutOverlay.classList.add("active");
  setTimeout(() => { window.location.href = "typography.html"; }, 2000);
}

async function evaluateActivity() {
  const moduleSelect = document.getElementById("training-module").value;
  const dateSelect   = document.getElementById("activity-date-select").value;
  const errorElem    = document.getElementById("evaluation-error");
  errorElem.style.display = "none";

  if (!moduleSelect || !dateSelect) {
    errorElem.textContent   = "Por favor, selecione o módulo e a data da atividade.";
    errorElem.style.display = "block";
    return;
  }

  currentModule       = moduleSelect;
  currentActivityDate = dateSelect;

  document.getElementById("activity-date").innerHTML =
    `<span>${currentModule} - ${new Date(currentActivityDate).toLocaleDateString("pt-BR")}</span>`;
  document.getElementById("activity-date").style.display = "block";

  document.getElementById("evaluation-options").style.display = "none";
  document.getElementById("results").style.display            = "block";

  const user  = JSON.parse(localStorage.getItem("loggedInUser"));
  const email = user?.email;

  // ▶️ CERTIFICADO: inicializa matching num escopo externo ao try
  let matching = null;

  try {
    const res    = await fetch(`${API_BASE_URL}/scores`);
    const scores = await res.json();

    matching = scores.find(
      s => s.user?.email === email && s.createdAt.startsWith(dateSelect)
    );

    if (matching) {
      const precisao = Math.min(matching.score || 0, 100);
      const tempo    = matching.playTime || 0;
      const erros    = matching.errors   || 0;

      document.getElementById("precision-value").textContent = `${precisao}%`;
      document.getElementById("time-value").textContent      = `${tempo}s`;
      document.getElementById("error-value").textContent     = `${erros}`;

      updatePrecisionChart(precisao);
      updateTimeChart(tempo);
      updateErrorChart(erros);
    } else {
      document.getElementById("precision-value").textContent = "--%";
      document.getElementById("time-value").textContent      = "--s";
      document.getElementById("error-value").textContent     = "--";

      updatePrecisionChart(0);
      updateTimeChart(0);
      updateErrorChart(0);
    }
  } catch (err) {
    console.error("Erro ao buscar dados da API:", err);
  }

  // ▶️ CERTIFICADO: exibe ou oculta botões/mensagem
  const certActions = document.getElementById("certificate-actions");
  const certMsg     = document.getElementById("certificate-message");

  if (matching) {
    certActions.style.display = "flex";
    certMsg.style.display     = "none";
  } else {
    certActions.style.display = "none";
    certMsg.style.display     = "block";
  }

  loadFeedback();

  document.getElementById("back-button").style.display = "inline-block";
  // (não é necessário re-exibir #results aqui, já está visível)
  


}

function loadFeedback() {
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
const loggedResidentName = loggedInUser?.name || "Residente Desconhecido";

const allFeedbacks = JSON.parse(localStorage.getItem("residentFeedbacks")) || {};
const container = document.getElementById("feedback-container");
container.innerHTML = "";
let found = false;

const feedbacks = allFeedbacks[loggedResidentName] || [];
feedbacks.forEach((fb) => {
  if (fb.module === currentModule && fb.activityDate === currentActivityDate) {
    found = true;
    const fbDiv = document.createElement("div");
    fbDiv.classList.add("feedback-item");
    fbDiv.innerHTML = `
      <p><strong>Tutor:</strong> ${fb.tutorName}</p>
      <p><strong>Avaliação Final:</strong> ${fb.finalEvaluation}</p>
      <p>${fb.feedback}</p>
      <p style="font-size: 0.9rem; color: #cbd5e1;">
        <em>${new Date(fb.date).toLocaleString('pt-BR')}</em>
      </p>
      <hr>
    `;
    container.appendChild(fbDiv);
  }
});

if (!found) {
  container.textContent = "Nenhum feedback disponível para este módulo e data.";
}
}

function refreshFeedback() {
  if (!currentModule || !currentActivityDate) {
    console.warn("Módulo ou data não selecionados. Execute a avaliação primeiro.");
    return;
  }

  const refreshButton = document.getElementById("refresh-feedback");
  refreshButton.classList.add("rotate");

  setTimeout(() => {
    refreshButton.classList.remove("rotate");
    loadFeedback(); // <- isso depende de currentModule e currentActivityDate
  }, 1000);
}

function goBack() {
  // Oculta resultados e volta ao formulário
  document.getElementById("results").style.display            = "none";
  document.getElementById("evaluation-options").style.display = "flex";
  document.getElementById("activity-date").style.display      = "none";
  document.getElementById("back-button").style.display        = "none";

  // ▶️ CERTIFICADO: ao voltar, esconde botões e mensagem
  document.getElementById("certificate-actions").style.display = "none";
  document.getElementById("certificate-message").style.display = "none";
}





async function updateChartsFromAPI() {
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!loggedInUser) return;
  const res = await fetch(`${API_BASE_URL}/scores`);
  const scores = await res.json();
  const filtered = scores.filter(s =>
    s.user?.email === loggedInUser.email &&
    s.createdAt.startsWith(currentActivityDate)
  );
  const precision = filtered.length
    ? Math.round(filtered.reduce((sum, s) => sum + s.score, 0) / filtered.length)
    : 0;
  const totalTime = filtered.reduce((sum, s) => sum + s.playTime, 0);
  const errors = filtered.filter(s => s.score < precision).length;

  updatePrecisionChart(precision);
  updateTimeChart(totalTime);
  updateErrorChart(errors);
}

function updatePrecisionChart(precision) {
  precisionChart?.destroy();
  const ctx = document.getElementById('precisionChart').getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 300);
  grad.addColorStop(0, '#06d6a0');
  grad.addColorStop(1, '#3b82f6');
  precisionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Precisão', 'Faltante'],
      datasets: [{
        data: [precision, 100 - precision],
        backgroundColor: [grad, '#ef476f'],
        borderWidth: 2
      }]
    },
    options: {
      cutout: '80%',
      plugins: { legend: { display: false } },
      animation: { animateScale: true, duration: 2000 }
    }
  });
}

function updateTimeChart(totalTime) {
  timeChart?.destroy();
  const ctx = document.getElementById('timeChart').getContext('2d');
  const grad1 = ctx.createLinearGradient(0, 0, 0, 300);
  grad1.addColorStop(0, '#06d6d4');
  grad1.addColorStop(1, '#3b82f6');
  const grad2 = ctx.createLinearGradient(0, 0, 0, 300);
  grad2.addColorStop(0, '#ef476f');
  grad2.addColorStop(1, '#06d6d4');
  timeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Tempo Utilizado (s)'],
      datasets: [{
        data: [totalTime],
        backgroundColor: [grad1],
        borderWidth: 2
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#f8f9fa' },
          grid: { color: 'rgba(248,249,250,0.2)' }
        },
        x: {
          ticks: { color: '#f8f9fa' },
          grid: { display: false }
        }
      },
      animation: { duration: 2000 }
    }
  });
}

function updateErrorChart(errors) {
  errorChart?.destroy();
  const ctx = document.getElementById('errorChart').getContext('2d');
  const grad1 = ctx.createLinearGradient(0, 0, 300, 0);
  grad1.addColorStop(0, '#06d6a0');
  grad1.addColorStop(1, '#3b82f6');
  const grad2 = ctx.createLinearGradient(0, 0, 300, 0);
  grad2.addColorStop(0, '#ef476f');
  grad2.addColorStop(1, '#06d6d4');
  errorChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Acertos', 'Erros'],
      datasets: [{
        data: [100 - errors * 10, errors * 10],
        backgroundColor: [grad1, grad2],
        borderWidth: 2
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        y: {
          ticks: { color: '#f8f9fa' },
          grid: { display: false }
        },
        x: {
          ticks: { color: '#f8f9fa' },
          grid: { color: 'rgba(248,249,250,0.2)' }
        }
      },
      animation: { duration: 2000 }
    }
  });
}

// ⬇️ Certificado e LinkedIn
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('download-certificate')
    .addEventListener('click', generateCertificate);

  document.getElementById('share-linkedin')
    .addEventListener('click', shareOnLinkedIn);
});

async function generateCertificate() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  // cria o jsPDF
  const doc = new window.jspdf.jsPDF({
    orientation: 'landscape', unit: 'pt', format: 'a4'
  });
  // carrega template de fundo (previamente salvo em /images/certificate-template.png)
  const img = new Image();
  img.src = 'images/certificate-template.png';
  img.onload = () => {
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.addImage(img, 'PNG', 0, 0, w, h);
    // textos
    doc.setFontSize(36);
    doc.text('Certificado de Conclusão', w/2, 200, { align: 'center' });
    doc.setFontSize(24);
    doc.text(user.name, w/2, 260, { align: 'center' });
    doc.setFontSize(16);
    doc.text(`Concluiu com êxito o ${currentModule}`, w/2, 300, { align: 'center' });
    doc.text(`em ${new Date(currentActivityDate).toLocaleDateString('pt-BR')}`, w/2, 330, { align: 'center' });
    // salva no client
    doc.save(`Certificado_${user.name}_${currentModule}.pdf`);
  };
}

async function shareOnLinkedIn() {
  const btn = document.getElementById('share-linkedin');
  btn.disabled = true;
  btn.textContent = 'Preparando...';

  // gera PDF em blob (sem template para agilizar)
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  const doc  = new window.jspdf.jsPDF({ orientation:'landscape', unit:'pt', format:'a4' });
  doc.setFontSize(30);
  doc.text('Certificado de Conclusão', 40, 80);
  doc.setFontSize(18);
  doc.text(user.name, 40, 120);
  doc.text(`Concluiu o ${currentModule} em ${new Date(currentActivityDate).toLocaleDateString('pt-BR')}`, 40, 160);
  const blob = doc.output('blob');

  // faz upload ao backend e obtém URL pública
  const form = new FormData();
  form.append('file', blob, `Certificado_${user.name}.pdf`);
  try {
    const res  = await fetch(`${API_BASE_URL}/certificates`, { method: 'POST', body: form });
    const json = await res.json();
    if (!res.ok || !json.url) throw new Error(json.message || 'Upload falhou');

    // abre share do LinkedIn
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(json.url)}`;
    window.open(shareUrl, '_blank');
  } catch (err) {
    console.error(err);
    alert('Não foi possível compartilhar no LinkedIn.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Compartilhar no LinkedIn';
  }
}
