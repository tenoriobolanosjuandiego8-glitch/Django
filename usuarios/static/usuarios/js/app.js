/* ==========================================================
   app.js – Lógica de login, registro y panel (SENA · JWT)

   - Cada página declara <body data-page="login|registro|panel">.
   - Los tokens viven SOLO en memoria (variables JS): no se usa
     localStorage, sessionStorage ni la URL.
   - Tras iniciar sesión, el panel se carga SIN recargar la página
     (se reemplaza el contenido y se actualiza la URL a /panel/),
     para no perder los tokens que están en memoria.
   - Si alguien abre /panel/ directamente (o recarga), no hay token
     y se le envía al inicio de sesión.
   ========================================================== */
(() => {
  "use strict";

  /* ---------- Estado en memoria ---------- */
  const sesion = { access: null, refresh: null, timer: null };

  /* ---------- Utilidades ---------- */
  const $ = (selector, raiz = document) => raiz.querySelector(selector);
  const $$ = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];

  function mostrarMensaje(elemento, texto, tipo = "error") {
    if (!elemento) return;
    elemento.className = "alert alert-" + tipo;
    elemento.textContent = texto;
    elemento.hidden = false;
  }

  function ocultarMensaje(elemento) {
    if (elemento) elemento.hidden = true;
  }

  function ocupado(boton, estaOcupado, textoOcupado) {
    if (!boton) return;
    if (estaOcupado) {
      boton.dataset.texto = boton.textContent;
      boton.textContent = textoOcupado;
    } else if (boton.dataset.texto) {
      boton.textContent = boton.dataset.texto;
    }
    boton.disabled = estaOcupado;
  }

  async function api(url, { metodo = "GET", cuerpo = null, conToken = false } = {}) {
    const cabeceras = { "Content-Type": "application/json" };
    if (conToken && sesion.access) cabeceras.Authorization = "Bearer " + sesion.access;
    const respuesta = await fetch(url, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo ? JSON.stringify(cuerpo) : null,
    });
    let datos = null;
    try { datos = await respuesta.json(); } catch (_) { /* respuesta sin cuerpo */ }
    return { ok: respuesta.ok, estado: respuesta.status, datos };
  }

  function decodificarJWT(token) {
    try {
      const carga = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(decodeURIComponent(escape(atob(carga))));
    } catch (_) {
      return null;
    }
  }

  function configurarMostrarClave() {
    $$(".toggle-pass").forEach((boton) => {
      boton.addEventListener("click", () => {
        const campo = document.getElementById(boton.dataset.target);
        const visible = campo.type === "text";
        campo.type = visible ? "password" : "text";
        boton.textContent = visible ? "Mostrar" : "Ocultar";
      });
    });
  }

  /* ==========================================================
     LOGIN
     ========================================================== */
  function iniciarLogin() {
    configurarMostrarClave();
    const formulario = $("#formLogin");
    const mensaje = $("#mensaje");
    const boton = $("#btnIngresar");
    if (!formulario) return;

    formulario.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      ocultarMensaje(mensaje);
      ocupado(boton, true, "Ingresando...");

      try {
        const r = await api("/api/token/", {
          metodo: "POST",
          cuerpo: {
            username: $("#usuario").value.trim(),
            password: $("#clave").value,
          },
        });

        if (!r.ok) {
          mostrarMensaje(mensaje, "Usuario o contraseña incorrectos.");
          return;
        }

        sesion.access = r.datos.access;
        sesion.refresh = r.datos.refresh;
        await abrirPanel();
      } catch (_) {
        mostrarMensaje(mensaje, "No se pudo conectar con el servidor.");
      } finally {
        ocupado(boton, false);
      }
    });
  }

  /* Carga /panel/ sin recargar la página para conservar los tokens en memoria */
  async function abrirPanel() {
    const respuesta = await fetch("/panel/");
    const html = await respuesta.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    document.title = doc.title;
    document.body.className = doc.body.className;
    document.body.dataset.page = "panel";
    document.body.innerHTML = doc.body.innerHTML;
    history.pushState({ pagina: "panel" }, "", "/panel/");
    iniciarPanel();
  }

  /* ==========================================================
     REGISTRO
     ========================================================== */
  function iniciarRegistro() {
    configurarMostrarClave();
    const formulario = $("#formRegistro");
    const mensaje = $("#mensaje");
    const boton = $("#btnRegistrar");
    if (!formulario) return;

    function limpiarErrores() {
      $$(".field-error", formulario).forEach((e) => e.remove());
    }

    function errorEnCampo(idCampo, texto) {
      const campo = document.getElementById(idCampo);
      if (!campo) return false;
      const p = document.createElement("div");
      p.className = "field-error";
      p.textContent = texto;
      (campo.closest(".form-group") || campo.parentElement).appendChild(p);
      return true;
    }

    formulario.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      ocultarMensaje(mensaje);
      limpiarErrores();

      if ($("#password").value !== $("#password2").value) {
        errorEnCampo("password2", "Las contraseñas no coinciden.");
        return;
      }

      ocupado(boton, true, "Registrando...");
      try {
        const r = await api("/api/registro/", {
          metodo: "POST",
          cuerpo: {
            username: $("#username").value.trim(),
            email: $("#email").value.trim(),
            identificacion: $("#identificacion").value.trim(),
            telefono: $("#telefono").value.trim(),
            password: $("#password").value,
          },
        });

        if (r.ok) {
          mostrarMensaje(mensaje, "Cuenta creada. Redirigiendo al inicio de sesión...", "success");
          setTimeout(() => { window.location.href = "/"; }, 1200);
          return;
        }

        // Errores de validación de DRF: { campo: ["mensaje", ...] }
        let sinCampo = [];
        Object.entries(r.datos || {}).forEach(([campo, errores]) => {
          const lista = Array.isArray(errores) ? errores : [String(errores)];
          lista.forEach((texto) => {
            if (!errorEnCampo(campo, texto)) sinCampo.push(texto);
          });
        });
        if (sinCampo.length || !r.datos) {
          mostrarMensaje(mensaje, sinCampo.join(" ") || "No fue posible registrar el usuario.");
        }
      } catch (_) {
        mostrarMensaje(mensaje, "No se pudo conectar con el servidor.");
      } finally {
        ocupado(boton, false);
      }
    });
  }

  /* ==========================================================
     PANEL
     ========================================================== */
  async function iniciarPanel() {
    // Sin token en memoria (acceso directo o recarga) → volver al login
    if (!sesion.access) {
      window.location.replace("/");
      return;
    }

    configurarMenuLateral();

    $("#btnSalir").addEventListener("click", cerrarSesion);
    $("#btnRenovar").addEventListener("click", () => renovarToken(true));

    const r = await api("/api/perfil/", { conToken: true });
    if (!r.ok) {
      // Intento único de renovar si el access expiró
      const renovado = await renovarToken(false);
      if (!renovado) return cerrarSesion();
      return iniciarPanel();
    }

    pintarPerfil(r.datos);
    iniciarCuentaRegresiva();
  }

  function pintarPerfil(d) {
    const texto = (id, valor) => { const el = document.getElementById(id); if (el) el.textContent = valor || "—"; };
    texto("pNombre", d.username);
    texto("pCorreo", d.email);
    texto("pId", d.id);
    texto("pIdentificacion", d.identificacion);
    texto("pTelefono", d.telefono);
    texto("pPrograma", d.programa);
    texto("pMensaje", d.mensaje);
    texto("statUsuario", d.username);
    texto("statPrograma", d.programa);
    texto("saludo", d.username);
    texto("userName", d.username);
    const inicial = (d.username || "?").charAt(0);
    texto("userAvatar", inicial);
  }

  function configurarMenuLateral() {
    const boton = $("#btnMenu");
    if (boton) boton.addEventListener("click", () => document.body.classList.toggle("menu-open"));
    $$(".nav a").forEach((enlace) => {
      enlace.addEventListener("click", () => {
        document.body.classList.remove("menu-open");
        $$(".nav a").forEach((a) => a.classList.remove("active"));
        enlace.classList.add("active");
      });
    });
  }

  function iniciarCuentaRegresiva() {
    clearInterval(sesion.timer);
    const etiqueta = $("#statExpira");
    const barra = $("#barraToken");
    const estado = $("#estadoToken");
    const carga = decodificarJWT(sesion.access);
    if (!carga || !carga.exp) return;

    const totalSegundos = Math.max(1, carga.exp - (carga.iat || carga.exp - 900));

    const pintar = async () => {
      const restante = carga.exp - Math.floor(Date.now() / 1000);
      if (restante <= 0) {
        clearInterval(sesion.timer);
        if (estado) { estado.textContent = "Expirado"; estado.className = "badge badge-warning"; }
        const ok = await renovarToken(false);
        if (!ok) cerrarSesion();
        return;
      }
      const m = String(Math.floor(restante / 60)).padStart(2, "0");
      const s = String(restante % 60).padStart(2, "0");
      if (etiqueta) etiqueta.textContent = m + ":" + s;
      if (barra) barra.style.width = Math.min(100, (restante / totalSegundos) * 100) + "%";
      if (estado) { estado.textContent = "Activo"; estado.className = "badge badge-success"; }
    };

    pintar();
    sesion.timer = setInterval(pintar, 1000);
  }

  async function renovarToken(avisar) {
    const mensaje = $("#mensajePanel");
    if (!sesion.refresh) return false;

    const r = await api("/api/token/refresh/", { metodo: "POST", cuerpo: { refresh: sesion.refresh } });
    if (!r.ok) {
      if (avisar) mostrarMensaje(mensaje, "No fue posible renovar la sesión.");
      return false;
    }
    sesion.access = r.datos.access;
    if (r.datos.refresh) sesion.refresh = r.datos.refresh; // ROTATE_REFRESH_TOKENS
    iniciarCuentaRegresiva();
    if (avisar) mostrarMensaje(mensaje, "Token de acceso renovado correctamente.", "success");
    return true;
  }

  async function cerrarSesion() {
    clearInterval(sesion.timer);
    if (sesion.refresh) {
      try {
        await api("/api/token/blacklist/", { metodo: "POST", cuerpo: { refresh: sesion.refresh } });
      } catch (_) { /* si falla, igual se limpia la sesión local */ }
    }
    sesion.access = null;
    sesion.refresh = null;
    window.location.replace("/");
  }

  /* ---------- Arranque ---------- */
  const paginas = { login: iniciarLogin, registro: iniciarRegistro, panel: iniciarPanel };

  document.addEventListener("DOMContentLoaded", () => {
    const iniciar = paginas[document.body.dataset.page];
    if (iniciar) iniciar();
  });

  // Botón "atrás/adelante": recarga la ruta real (sin token → login)
  window.addEventListener("popstate", () => window.location.reload());
})();
