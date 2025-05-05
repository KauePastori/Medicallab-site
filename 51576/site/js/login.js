// Usuários fixos para teste
const users = [
  { email: "residente@test.com", password: "12345", type: "resident" },
  { email: "tutor@test.com", password: "12345", type: "tutor" },
];

// *** Carrega usuários registrados do localStorage ***
const customUsers = JSON.parse(localStorage.getItem("customUsers")) || [];
customUsers.forEach(user => users.push(user));

// Manipulação do formulário de login
const authForm = document.getElementById("login-form");
let authMessage = document.getElementById("auth-message");

// Evento de submit do formulário
authForm.addEventListener("submit", (e) => {
  e.preventDefault(); // Prevenir recarregamento da página

  // Verifica se o formulário está no modo de registro (campo "name" existe)
  if (document.getElementById("name")) {
    // Obter valores dos inputs do registro
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const userType = document.getElementById("user-type").value;

    // Verifica se o usuário já está cadastrado
    const userExists = users.find(user => user.email === email);
    if (userExists) {
      authMessage.textContent = "Usuário já cadastrado. Faça login ou utilize outro email.";
      authMessage.style.color = "red";
      return;
    }

    // Cria o novo usuário
    const newUser = { email, password, type: userType, name };

    // Salva o novo usuário no localStorage (em um array chamado "customUsers")
    let customUsers = JSON.parse(localStorage.getItem("customUsers")) || [];
    customUsers.push(newUser);
    localStorage.setItem("customUsers", JSON.stringify(customUsers));

    // Adiciona o novo usuário à lista para login imediato
    users.push(newUser);

    // Exibe mensagem de sucesso inline
    authMessage.textContent = (newUser.type === "resident")
      ? "Cadastro realizado com sucesso. Agora você pode acessar a área de residente."
      : "Cadastro realizado com sucesso. Agora você pode acessar a área do tutor.";
    authMessage.style.color = "green";

    // Salva o usuário logado para uso nas áreas protegidas
    localStorage.setItem("loggedInUser", JSON.stringify(newUser));

    // Redireciona após 2 segundos
    setTimeout(() => {
      if (newUser.type === "resident") {
        window.location.href = "resident.html";
      } else if (newUser.type === "tutor") {
        window.location.href = "tutor.html";
      }
    }, 2000);
    return;
  }

  // Caso esteja no modo de login (sem o campo "name")
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const userType = document.getElementById("user-type").value;

  // Procura o usuário na lista (fixos + registrados)
  const user = users.find(
    (user) => user.email === email && user.password === password
  );

  if (user) {
    if (user.type === userType) {
      // Salva o usuário logado
      localStorage.setItem("loggedInUser", JSON.stringify(user));

      // Redireciona conforme o tipo
      if (user.type === "resident") {
        window.location.href = "resident.html";
      } else if (user.type === "tutor") {
        window.location.href = "tutor.html";
      }
    } else {
      showError(
        `Você selecionou o tipo "${userType}" mas suas credenciais pertencem a um "${user.type}". Verifique sua seleção.`
      );
    }
  } else {
    showError("Email ou senha incorretos. Tente novamente.");
  }
});

// Função para exibir mensagens de erro
function showError(message) {
  authMessage.textContent = message;
  authMessage.style.color = "red";
  authMessage.style.marginTop = "10px";
}

// Alterna para o modo de registro
const createAccountLink = document.getElementById("create-account");
if (createAccountLink) {
  createAccountLink.addEventListener("click", function (e) {
    e.preventDefault();
    authForm.innerHTML = `
      <select name="user-type" id="user-type">
        <option value="resident">Residente</option>
        <option value="tutor">Tutor</option>
      </select>
      <input type="text" id="name" placeholder="Nome Completo" required>
      <input type="email" id="email" placeholder="Email" required>
      <input type="password" id="password" placeholder="Senha" required>
      <button type="submit" id="auth-submit" class="btn btn-primary w-100">Criar Conta</button>
      <a href="#" id="back-to-login">Já tem uma conta? Faça login aqui</a>
      <div id="auth-message" class="text-center mb-3"></div>
    `;
    authMessage = document.getElementById("auth-message");
    const backToLoginLink = document.getElementById("back-to-login");
    backToLoginLink.addEventListener("click", function (e) {
      e.preventDefault();
      location.reload();
    });
  });
}
