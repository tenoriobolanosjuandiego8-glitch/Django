const loginForm = document.getElementById('formLogin');

if (loginForm) {
  const loginMessage = document.getElementById('mensaje');
  const loginButton = document.getElementById('btnEntrar');

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = document.getElementById('correo').value.trim();
    const password = document.getElementById('clave').value;

    loginMessage.className = 'mensaje';
    if (!email.includes('@') || password.length < 4) {
      loginMessage.textContent = 'Revisa tu correo y contraseña (mínimo 4 caracteres).';
      loginMessage.classList.add('error');
      return;
    }

    loginButton.disabled = true;
    loginButton.textContent = 'Entrando…';
    document.body.classList.add('acelerando');
    loginMessage.textContent = 'Preparando tu ruta…';

    window.setTimeout(() => {
      loginMessage.textContent = '¡Listo! Sesión iniciada (demostración).';
      loginMessage.classList.add('ok');
      loginButton.textContent = 'Sesión iniciada';
    }, 2200);
  });
}

const registrationForm = document.getElementById('formRegistro');

if (registrationForm) {
  const registrationMessage = document.getElementById('mensaje');
  const registrationButton = document.getElementById('btnRegistrar');
  const passwordInput = document.getElementById('password');
  const confirmationInput = document.getElementById('password2');

  registrationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    registrationMessage.className = 'mensaje';
    registrationMessage.textContent = '';

    if (!registrationForm.reportValidity()) {
      return;
    }

    if (passwordInput.value !== confirmationInput.value) {
      registrationMessage.textContent = 'Las contraseñas no coinciden.';
      registrationMessage.classList.add('error');
      confirmationInput.focus();
      return;
    }

    registrationButton.disabled = true;
    registrationButton.textContent = 'Creando cuenta…';

    try {
      const response = await fetch('/api/registro/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          username: document.getElementById('username').value.trim(),
          email: document.getElementById('email').value.trim(),
          password: passwordInput.value,
          identificacion: document.getElementById('identificacion').value.trim(),
          telefono: document.getElementById('telefono').value.trim(),
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const details = Object.values(result).flatMap((value) =>
          Array.isArray(value) ? value : [value],
        );
        throw new Error(details.filter(Boolean).join(' ')
          || 'No se pudo crear la cuenta. Revisa los datos e inténtalo de nuevo.');
      }

      registrationMessage.textContent = 'Cuenta creada. Ya puedes iniciar sesión.';
      registrationMessage.classList.add('ok');
      registrationForm.reset();
    } catch (error) {
      registrationMessage.textContent = error.message
        || 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
      registrationMessage.classList.add('error');
    } finally {
      registrationButton.disabled = false;
      registrationButton.textContent = 'Crear cuenta';
    }
  });
}
