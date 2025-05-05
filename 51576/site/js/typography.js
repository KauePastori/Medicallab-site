// login.js

const API = window.API_BASE_URL || "http://localhost:4000/api";

let isRegister = false;
const form      = document.getElementById("login-form");
const heading   = document.querySelector(".form-section h2");
let authMessage = document.getElementById("auth-message");

// 1) Buscar todos e filtrar
async function userExists(email) {
  try {
    const res = await fetch(`${API}/users`);
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    const users = await res.json();
    return users.some(u => u.email.toLowerCase() === email.toLowerCase());
  } catch (err) {
    console.error("Erro ao verificar usuário:", err);
    // Para não travar o front por causa de falha de rede, devolve false
    return false;
  }
}

function renderForm() {
  authMessage.textContent = "";
  if (isRegister) {
    heading.textContent = "Registre-se";
    form.innerHTML = `
      <select name="user-type" id="user-type">
        <option value="resident">Residente</option>
        <option value="tutor">Tutor</option>
      </select>
      <input type="email"    name="email"    id="email"    placeholder="Email" required>
      <input type="password" name="password" id="password" placeholder="Senha" required>
      <input type="text"     name="name"     id="name"     placeholder="Nome Completo" required>
      <button type="submit" class="btn btn-primary w-100">Criar Conta</button>
      <a href="#" id="back-to-login">Já tem uma conta? Faça login aqui</a>
      <div id="auth-message" class="text-center text-danger mb-3"></div>
    `;
    document.getElementById("back-to-login")
      .addEventListener("click", e => {
        e.preventDefault();
        isRegister = false;
        renderForm();
      });
  } else {
    heading.textContent = "Entrar";
    form.innerHTML = `
      <select name="user-type" id="user-type">
        <option value="resident">Residente</option>
        <option value="tutor">Tutor</option>
      </select>
      <input type="email"    name="email"    id="email"    placeholder="Email" required>
      <input type="password" name="password" id="password" placeholder="Senha" required>
      <button type="submit" class="btn btn-primary w-100">Entrar</button>
      <a href="#" id="create-account">Não tem uma conta? Crie aqui</a>
      <div id="auth-message" class="text-center text-danger mb-3"></div>
    `;
    document.getElementById("create-account")
      .addEventListener("click", e => {
        e.preventDefault();
        isRegister = true;
        renderForm();
      });
  }
  authMessage = document.getElementById("auth-message");
}

// 2) Liga o submit SEM { once: true }
form.addEventListener("submit", async e => {
  e.preventDefault();
  authMessage.textContent = "";

  const fd       = new FormData(form);
  const email    = (fd.get("email")    || "").trim();
  const password = (fd.get("password") || "").trim();
  const name     = isRegister ? (fd.get("name") || "").trim() : null;
  const userType = fd.get("user-type");

  if (!email || !password || (isRegister && !name)) {
    authMessage.textContent = "Preencha todos os campos obrigatórios.";
    return;
  }

  // --- Fluxo de registro ---
  if (isRegister) {
    const exists = await userExists(email);
    if (exists) {
      authMessage.textContent = "Já existe uma conta com esse e-mail.";
      return;
    }
    // se não existe, cria
    try {
      const res = await fetch(`${API}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      if (res.status === 409) {  // conflito tratado no back
        authMessage.textContent = "Já existe uma conta com esse e-mail.";
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `Erro ${res.status}`);
      }
      const { user } = await res.json();
      localStorage.setItem("loggedInUser", JSON.stringify({ ...user, userType }));
      if (userType === "tutor") localStorage.setItem("currentTutor", user.name);
      window.location.href = userType === "tutor" ? "tutor.html" : "resident.html";
    } catch (err) {
      authMessage.textContent = err.message || "Erro ao criar conta.";
    }
    return;
  }

  // --- Fluxo de login ---
  {
    // opcional: você pode remover essa verificação se confiar só no POST /auth/login
    const exists = await userExists(email);
    if (!exists) {
      authMessage.textContent = "Nenhuma conta encontrada com esse e-mail.";
      return;
    }
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `Erro ${res.status}`);
      }
      const { user } = await res.json();
      localStorage.setItem("loggedInUser", JSON.stringify({ ...user, userType }));
      if (userType === "tutor") localStorage.setItem("currentTutor", user.name);
      window.location.href = userType === "tutor" ? "tutor.html" : "resident.html";
    } catch (err) {
      authMessage.textContent = err.message || "E-mail ou senha incorretos.";
    }
  }
});

// boot
renderForm();
