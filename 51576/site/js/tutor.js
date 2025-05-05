// tutor.js

// Configuração da API
const API_BASE_URL = window.API_BASE_URL || "http://localhost:4000/api";

// Variáveis de estilo
const rootStyles = getComputedStyle(document.documentElement);
const neon     = rootStyles.getPropertyValue('--neon').trim();
const neonAlt  = rootStyles.getPropertyValue('--neon-alt').trim();
const bgLight  = rootStyles.getPropertyValue('--bg-light').trim();

// Variáveis globais
let currentModule = "";
let currentActivityDate = "";
let currentResidentName = "";
let precisionChart, timeChart, errorChart;
let pendingDeletion = null;

// Função de logout
function logout() {
  const logoutOverlay = document.getElementById("logout-overlay");
  logoutOverlay.classList.add("active");
  setTimeout(() => { window.location.href = "typography.html"; }, 2000);
}

// Botão voltar
document.getElementById("back-button").addEventListener("click", goBack);

// Função para resetar estado
function goBack() {
  document.getElementById("activity-date").style.display           = "none";
  document.getElementById("summary-row").style.display            = "none";
  document.querySelector(".chart-row").style.display              = "none";
  document.getElementById("feedback-form-container").style.display = "none";
  document.getElementById("feedback-list-container").style.display = "none";
  document.getElementById("back-button").style.display            = "none";
  document.getElementById("resident-selector").style.display      = "flex";
  document.getElementById("search-container").style.display        = "flex";
  Array.from(document.getElementsByClassName("resident-card"))
       .forEach(card => card.classList.remove("selected"));
}

// Função para buscar scores da API
async function fetchScores() {
  const res = await fetch(`${API_BASE_URL}/scores`); 
  
  if (!res.ok) throw new Error(`Erro ao buscar scores: ${res.status}`);
  return res.json();
}

// Função para montar cards de residentes conforme nomes na API
async function loadResidents() {
  const container = document.getElementById("resident-selector");
  const overlay   = document.getElementById("loading-overlay");

  container.innerHTML = "";
  overlay.style.display = "flex";
  try {
    const allScores = await fetchScores();
    const names = Array.from(new Set(allScores.map(s => s.user?.name).filter(Boolean)))

                       .sort((a, b) => a.localeCompare(b));

    if (names.length === 0) {
      container.textContent = "Nenhum residente encontrado.";
    } else {
      names.forEach(name => {
        const card = document.createElement("div");
        card.className = "resident-card";
        card.innerHTML = `<h3>${name}</h3>`;
        card.addEventListener("click", async () => {
          Array.from(container.children)
               .forEach(c => c.classList.remove("selected"));
          card.classList.add("selected");
          await loadResidentData(name);
        });
        container.appendChild(card);
      });
    }
  } catch (err) {
    console.error("Erro ao carregar residentes:", err);
    container.textContent = "Falha ao carregar residentes.";
  } finally {
    overlay.style.display = "none";
  }
}

// Função para carregar dados do residente selecionado e popular o dropdown de datas
async function loadResidentData(name) {
  currentResidentName = name;
  const allScores = await fetchScores();
  const dates = Array.from(
    new Set(
      allScores
        .filter(s => s.user?.name === name)
        .map(s => s.createdAt?.slice(0, 10))
        .filter(Boolean)
    )
  ).sort();
  

  // Popula select de datas
  const dateSelect = document.getElementById("activity-date-select");
  dateSelect.innerHTML = '<option value="">Selecione a data</option>';
  dates.forEach(dt => {
    const opt = document.createElement("option");
    opt.value = dt;
    opt.textContent = new Date(dt).toLocaleDateString('pt-BR');
    dateSelect.appendChild(opt);
  });

  // Exibe formulário de avaliação
  document.getElementById("resident-selector").style.display  = "none";
  document.getElementById("search-container").style.display   = "none";
  document.getElementById("evaluation-options").style.display = "flex";
  document.getElementById("evaluation-error").style.display   = "none";
}

// Inicia ao carregar DOM
document.addEventListener("DOMContentLoaded", () => {
  loadResidents();
  window.addEventListener("storage", event => {
    if (event.key === "customUsers") loadResidents();
  });
});

// Avaliar atividade
async function evaluateActivity() {
  const moduleSelect = document.getElementById("training-module").value;
  const dateSelect   = document.getElementById("activity-date-select").value;
  const errorElem    = document.getElementById("evaluation-error");
  errorElem.style.display = "none";

  if (!moduleSelect || !dateSelect) {
    errorElem.textContent = "Por favor, selecione o módulo e a data da atividade.";
    errorElem.style.display = "block";
    return;
  }

  currentModule       = moduleSelect;
  currentActivityDate = dateSelect;

  // Atualiza cabeçalho
  const headerEl = document.getElementById("activity-date");
  headerEl.innerHTML = `
    <p><strong>Residente:</strong> ${currentResidentName}</p>
    <p><strong>Atividade:</strong> ${currentModule} - ${new Date(currentActivityDate).toLocaleDateString('pt-BR')}</p>`;
  headerEl.style.display = "block";

  // Exibe seções
  document.getElementById("evaluation-options").style.display    = "none";
  document.getElementById("summary-row").style.display          = "flex";
  document.querySelector(".chart-row").style.display             = "flex";
  document.getElementById("feedback-form-container").style.display = "flex";
  document.getElementById("back-button").style.display          = "block";

  const overlay = document.getElementById("loading-overlay");
  overlay.style.display = "flex";
  try {
    const allScores = await fetchScores();

    // 🔄 Correção aqui: compara datas com slice
    const filtered = allScores.filter(s =>
      s.user?.name === currentResidentName &&
      s.createdAt?.slice(0, 10) === currentActivityDate
    );

    console.log("Filtrados:", filtered);

    const precision = filtered.length
      ? Math.round(filtered.reduce((sum, s) => sum + s.score, 0) / filtered.length)
      : 0;
    const totalTime = filtered.reduce((sum, s) => sum + s.playTime, 0);
    const errors    = filtered.filter(s => s.score < precision).length;

    updateSummary({ precision, time: totalTime, errors });
    renderCharts({ precision, time: totalTime, errors });
  } catch (err) {
    console.error(err);
    errorElem.textContent = "Erro ao carregar resultados.";
    errorElem.style.display = "block";
  } finally {
    overlay.style.display = "none";
  }
}


document.querySelector("#evaluation-options button")
        .addEventListener("click", evaluateActivity);

// Renderiza gráficos
function renderCharts({ precision, time, errors }) {
  // Precisão
  const ctx1 = document.getElementById("chartPrecisao").getContext("2d");
  if (precisionChart) precisionChart.destroy();
  const grad1 = ctx1.createLinearGradient(0, 0, 0, 400);
  grad1.addColorStop(0, neon);
  grad1.addColorStop(1, bgLight);
  precisionChart = new Chart(ctx1, {
    type: "doughnut",
    data: {
      labels: ["Precisão", "Faltante"],
      datasets: [{ data: [precision, 100 - precision], backgroundColor: [grad1, "#2d3748"], borderWidth: 0 }]
    },
    options: {
      cutout: '70%',
      plugins: {
        legend: {
          position: 'top',
          labels: { color: rootStyles.getPropertyValue('--text-color').trim() }
        }
      },
      animation: { animateScale: true, duration: 2000 }
    }
  });

  // Tempo
  const ctx2 = document.getElementById("chartTempo").getContext("2d");
  if (timeChart) timeChart.destroy();
  const grad2 = ctx2.createLinearGradient(0, 0, 0, 400);
  grad2.addColorStop(0, neonAlt);
  grad2.addColorStop(1, neon);
  timeChart = new Chart(ctx2, {
    type: "bar",
    data: {
      labels: ["Tempo Utilizado (s)"],
      datasets: [{ data: [time], backgroundColor: [grad2], borderWidth: 0 }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.raw}s` } }
      },
      scales: {
        x: { ticks: { color: rootStyles.getPropertyValue('--text-color').trim() }, grid: { display: false } },
        y: { beginAtZero: true, max: time * 2, ticks: { color: rootStyles.getPropertyValue('--text-color').trim() }, grid: { color: 'rgba(248,249,250,0.2)' } }
      },
      animation: { duration: 1500 }
    }
  });

  // Erros
  const ctx3 = document.getElementById("chartErros").getContext("2d");
  if (errorChart) errorChart.destroy();
  const grad3 = ctx3.createLinearGradient(0, 0, 0, 400);
  grad3.addColorStop(0, "rgba(239,68,68,0.7)");
  grad3.addColorStop(1, "rgba(6,182,212,0.3)");
  errorChart = new Chart(ctx3, {
    type: "radar",
    data: {
      labels: ["Acertos", "Erros", "Pontualidade", "Consistência"],
      datasets: [{
        label: "Desempenho",
        data: [100 - errors * 10, errors * 10, 80, 70],
        fill: true,
        backgroundColor: grad3,
        borderColor: "rgba(6,182,212,1)",
        pointBackgroundColor: "rgba(239,68,68,1)",
        pointBorderColor: "#fff"
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: rootStyles.getPropertyValue('--text-color').trim(),
            font: { size: 14 }
          }
        },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw}` } }
      },
      scales: {
        r: {
          angleLines: { color: "rgba(255,255,255,0.2)" },
          grid:       { color: "rgba(255,255,255,0.2)" },
          ticks:      { display: false },
          pointLabels:{ color: rootStyles.getPropertyValue('--text-color').trim(), font: { size: 14 } }
        }
      },
      animation: { duration: 2000, easing: "easeOutBounce" }
    }
  });
}

// Atualiza resumo
function updateSummary({ precision, time, errors }) {
  document.getElementById("summary-precision").textContent = `${precision}%`;
  document.getElementById("summary-time").textContent      = `${time}s`;
  document.getElementById("summary-errors").textContent    = `${errors}`;
}

/* FUNÇÃO PARA SALVAR FEEDBACK */
function saveFeedback() {
  const feedback = document.getElementById("feedback").value.trim();
  const evaluation = document.getElementById("final-evaluation").value;
  const feedbackError = document.getElementById("feedback-error");
  const feedbackStatus = document.getElementById("feedback-status");

  feedbackError.style.display = "none";
  feedbackStatus.style.display = "none";

  const tutorName = localStorage.getItem("currentTutor") || "Tutor Desconhecido";
  console.log("Tutor que está salvando feedback:", tutorName);

  if (!feedback || !evaluation || !currentResidentName) {
    feedbackError.textContent = "Por favor, preencha o feedback e selecione a avaliação final.";
    feedbackError.style.display = "block";
    return;
  }

  feedbackStatus.textContent = "Enviando feedback...";
  feedbackStatus.style.display = "block";
  feedbackStatus.style.color = neon;

  setTimeout(() => {
    let feedbacks = JSON.parse(localStorage.getItem("residentFeedbacks")) || {};

    const feedbackData = {
      module: currentModule,
      activityDate: currentActivityDate,
      feedback: feedback,
      finalEvaluation: evaluation,
      tutorName: tutorName,
      date: new Date().toISOString()
    };

    if (!feedbacks[currentResidentName]) {
      feedbacks[currentResidentName] = [];
    }
    feedbacks[currentResidentName].push(feedbackData);
    localStorage.setItem("residentFeedbacks", JSON.stringify(feedbacks));

    feedbackStatus.textContent = "Feedback enviado com sucesso!";
    feedbackStatus.style.color = "green";

    document.getElementById("feedback").value = "";
    document.getElementById("final-evaluation").value = "";

    setTimeout(() => { feedbackStatus.style.display = "none"; }, 3000);
  }, 2000);
}


/* FUNÇÃO PARA ALTERNAR A VISUALIZAÇÃO DA LISTA DE FEEDBACKS */
function toggleFeedbackList() {
  var container = document.getElementById("feedback-list-container");
  if (container.style.display === "none" || container.style.display === "") {
    populateFeedbackList();
    container.style.display = "flex";
  } else {
    container.style.display = "none";
  }
}

/* FUNÇÃO PARA POPULAR A LISTA DE FEEDBACKS */
function populateFeedbackList() {
  const feedbackListContent = document.getElementById("feedback-list-content");
  feedbackListContent.innerHTML = "";

  const feedbacks = JSON.parse(localStorage.getItem("residentFeedbacks")) || {};
  let hasFeedback = false;

  for (let residentName in feedbacks) {
    if (feedbacks.hasOwnProperty(residentName)) {
      feedbacks[residentName].forEach(function(entry, index) {
        hasFeedback = true;
        const date = new Date(entry.date).toLocaleString('pt-BR');

        const feedbackItem = document.createElement("div");
        feedbackItem.className = "feedback-item";
        feedbackItem.setAttribute("data-resident", residentName);
        feedbackItem.setAttribute("data-index", index);

        feedbackItem.innerHTML =
          `<p><strong>Residente:</strong> ${residentName}</p>
           <p><strong>Módulo:</strong> ${entry.module}</p>
           <p><strong>Data da Atividade:</strong> ${entry.activityDate}</p>
           <p><strong>Avaliação:</strong> ${entry.finalEvaluation}</p>
           <p><strong>Feedback:</strong> ${entry.feedback}</p>
           <p><strong>Enviado por:</strong> ${entry.tutorName}</p>
           <p><strong>Data do Envio:</strong> ${date}</p>
           <button onclick="editFeedback('${residentName}', ${index})">Editar</button>
           <button onclick="promptDeleteFeedback('${residentName}', ${index})">Excluir</button>`;

        feedbackListContent.appendChild(feedbackItem);
      });
    }
  }

  if (!hasFeedback) {
    feedbackListContent.innerHTML = "<p>Nenhum feedback enviado.</p>";
  }
}


/* FUNÇÃO PARA EDITAR FEEDBACK */
function editFeedback(residentName, index) {
  const feedbacks = JSON.parse(localStorage.getItem("residentFeedbacks")) || {};
  if (!feedbacks[residentName] || !feedbacks[residentName][index]) return;

  const entry = feedbacks[residentName][index];
  const feedbackItem = document.querySelector(`.feedback-item[data-resident="${residentName}"][data-index="${index}"]`);

  if (feedbackItem) {
    feedbackItem.innerHTML =
      `<p><strong>Residente:</strong> ${residentName}</p>
       <label><strong>Avaliação:</strong></label>
       <select id="edit-evaluation-${index}" class="edit-select">
         <option value="Falhou" ${entry.finalEvaluation === "Falhou" ? "selected" : ""}>Falhou</option>
         <option value="Ruim" ${entry.finalEvaluation === "Ruim" ? "selected" : ""}>Ruim</option>
         <option value="Mediano" ${entry.finalEvaluation === "Mediano" ? "selected" : ""}>Mediano</option>
         <option value="Bom" ${entry.finalEvaluation === "Bom" ? "selected" : ""}>Bom</option>
         <option value="Excelente" ${entry.finalEvaluation === "Excelente" ? "selected" : ""}>Excelente</option>
       </select>
       <label><strong>Feedback:</strong></label>
       <textarea id="edit-feedback-${index}" class="edit-textarea">${entry.feedback}</textarea>
       <div style="margin-top:10px;">
         <button onclick="saveEditedFeedback('${residentName}', ${index})">Salvar</button>
         <button onclick="populateFeedbackList()">Cancelar</button>
       </div>`;
  }
}


/* FUNÇÃO PARA SALVAR FEEDBACK EDITADO */
function saveEditedFeedback(residentName, index) {
  const newEvaluation = document.getElementById(`edit-evaluation-${index}`).value;
  const newFeedback = document.getElementById(`edit-feedback-${index}`).value;
  const feedbacks = JSON.parse(localStorage.getItem("residentFeedbacks")) || {};

  if (feedbacks[residentName] && feedbacks[residentName][index]) {
    feedbacks[residentName][index].finalEvaluation = newEvaluation;
    feedbacks[residentName][index].feedback = newFeedback;
    localStorage.setItem("residentFeedbacks", JSON.stringify(feedbacks));
    populateFeedbackList();
  }
}


/* FUNÇÃO PARA EXIBIR MODAL DE CONFIRMAÇÃO PARA EXCLUSÃO */
function promptDeleteFeedback(email, index) {
  pendingDeletion = { email: email, index: index };
  document.getElementById("delete-confirmation-modal").style.display = "flex";
}

/* EVENTOS DO MODAL DE EXCLUSÃO */
document.getElementById("confirm-delete-btn").addEventListener("click", function() {
  if (pendingDeletion) {
    var email = pendingDeletion.email;
    var index = pendingDeletion.index;
    var feedbacks = JSON.parse(localStorage.getItem("residentFeedbacks")) || {};
    if (feedbacks[email]) {
      feedbacks[email].splice(index, 1);
      localStorage.setItem("residentFeedbacks", JSON.stringify(feedbacks));
      populateFeedbackList();
    }
    pendingDeletion = null;
    document.getElementById("delete-confirmation-modal").style.display = "none";
  }
});
document.getElementById("cancel-delete-btn").addEventListener("click", function() {
  pendingDeletion = null;
  document.getElementById("delete-confirmation-modal").style.display = "none";
});
// Busca por nome de residente
function searchResident() {
  const filter = document.getElementById("resident-search").value.toLowerCase();
  Array.from(document.getElementsByClassName("resident-card")).forEach(card => {
    const name = card.querySelector("h3").textContent.toLowerCase();
    card.style.display = name.includes(filter) ? "" : "none";
  });
}
document.getElementById("resident-search").addEventListener("keyup", searchResident);
