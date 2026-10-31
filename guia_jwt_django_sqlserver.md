# Guía de aprendizaje: Autenticación con JWT en Django y SQL Server

**SENA – Regional Cauca – Programa ADSO**
Elaborada por: Ingeniero David Lozada
Duración sugerida: 12 horas · Nivel: Intermedio

---

## 1. Objetivo

Desarrollar un sistema de autenticación con Django, JSON Web Tokens (JWT) y Microsoft SQL Server: modelos, vistas, plantillas HTML, rutas, migraciones y mecanismos de seguridad.

## 2. Resultado esperado

Una aplicación web que permita **registrar usuarios, iniciar sesión, generar tokens JWT, acceder a recursos protegidos y cerrar sesión**, guardando los datos en SQL Server.

## 3. Arquitectura

```
Navegador (HTML · CSS · JS)
        ↓
Django (URLs · Views · Templates)
        ↓
Autenticación JWT (Access Token · Refresh Token)
        ↓
Django ORM (Modelos · Migraciones)
        ↓
SQL Server (Usuarios · Perfiles · Datos)
```

- Django REST Framework + Simple JWT emiten y validan los tokens.
- Las páginas HTML consumen los endpoints JWT con JavaScript.
- Las contraseñas se guardan con el hash de Django, nunca en texto plano.
- El access token se mantiene **en memoria** del navegador (no en localStorage).

## 4. Herramientas

| Herramienta | Función |
|---|---|
| Python 3.12+ | Lenguaje |
| Django | Framework backend |
| Django REST Framework | API |
| Simple JWT | Tokens |
| Microsoft SQL Server | Base de datos |
| mssql-django | Conector Django–SQL Server |
| Visual Studio Code | Editor |
| HTML, CSS, JavaScript | Interfaz |

---

## 5. Fase 1. Crear el proyecto

**macOS / Linux:**

```bash
mkdir autenticacion_jwt
cd autenticacion_jwt
python3 -m venv entorno
source entorno/bin/activate
python -m pip install "Django>=5.2,<6.2" djangorestframework djangorestframework-simplejwt "mssql-django>=1.8,<3" python-dotenv
django-admin startproject config .
python manage.py startapp usuarios
```

**Windows (activar el entorno):**

```powershell
.\entorno\Scripts\Activate.ps1
```

Estructura inicial:

```
autenticacion_jwt/
├── entorno/
├── manage.py
├── .env
├── .gitignore
├── config/
│   ├── settings.py
│   └── urls.py
└── usuarios/
    ├── models.py
    ├── views.py
    ├── admin.py
    └── migrations/
```

> Nota: la guía original repite `startapp usuarios` dos veces; solo se ejecuta una.

---

## 6. Fase 2. Configurar SQL Server

### Paso 1. Crear la base de datos

En SQL Server Management Studio o Azure Data Studio:

```sql
CREATE DATABASE SenaJWT;
GO
```

Crea un **usuario SQL** con permisos para crear y modificar tablas (necesario para las migraciones). **No uses la cuenta `sa`** desde Django.

Verifica que el **controlador ODBC de Microsoft** (ODBC Driver 18 for SQL Server) esté instalado.

### Paso 2. Variables de entorno

Crea `.env` junto a `manage.py`:

```env
DB_NAME=SenaJWT
DB_USER=usuario_django
DB_PASSWORD=colocar_clave_segura
DB_HOST=localhost
DB_PORT=1433
DB_DRIVER=ODBC Driver 18 for SQL Server
DB_ENCRYPT=yes
DB_TRUST_CERTIFICATE=no
```

Si usas una instancia local con certificado de desarrollo no confiable, puede ser necesario `DB_TRUST_CERTIFICATE=yes` **solo temporalmente**. No lo uses en producción sin evaluar riesgos.

Crea `.gitignore` y agrega:

```
.env
entorno/
__pycache__/
*.pyc
```

### Paso 3. Configurar `config/settings.py`

Importaciones (después de definir `BASE_DIR`):

```python
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv(BASE_DIR / ".env")
```

Base de datos:

```python
DATABASES = {
    "default": {
        "ENGINE": "mssql",
        "NAME": os.getenv("DB_NAME"),
        "USER": os.getenv("DB_USER"),
        "PASSWORD": os.getenv("DB_PASSWORD"),
        "HOST": os.getenv("DB_HOST"),
        "PORT": os.getenv("DB_PORT", "1433"),
        "OPTIONS": {
            "driver": os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server"),
            "extra_params": (
                f"Encrypt={os.getenv('DB_ENCRYPT', 'yes')};"
                f"TrustServerCertificate={os.getenv('DB_TRUST_CERTIFICATE', 'no')}"
            ),
        },
    }
}
```

Aplicaciones:

```python
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "usuarios",
]
```

Autenticación con DRF:

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}
```

Configuración de JWT:

```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(hours=8),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}
```

---

## 7. Fase 3. Modelos

Se usa el modelo `User` de Django (username, password, email, first_name, last_name) y se crea un modelo complementario `PerfilUsuario`.

**`usuarios/models.py`**

```python
from django.db import models
from django.conf import settings


class PerfilUsuario(models.Model):
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="perfil"
    )
    identificacion = models.CharField(max_length=20, unique=True)
    telefono = models.CharField(max_length=20, blank=True)
    programa = models.CharField(max_length=100, default="ADSO")

    def __str__(self):
        return self.usuario.username
```

**Relación entre modelos**

```
auth_user                      usuarios_perfilusuario
-----------                    ----------------------
id (PK)            1 : 1       id (PK)
username         ────────────  usuario_id (FK)
password (hash)                identificacion
email                          telefono
first_name                     programa
```

Conceptos clave: llave primaria, llave foránea, relación uno a uno, integridad referencial y almacenamiento seguro de contraseñas.

---

## 8. Fase 4. Migraciones

```bash
python manage.py check
python manage.py makemigrations usuarios
python manage.py migrate
python manage.py showmigrations
```

1. `check` revisa la configuración.
2. `makemigrations` genera la migración del modelo.
3. `migrate` crea las tablas en SQL Server.

### Verificar las tablas en SQL Server

```sql
USE SenaJWT;
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
```

| Tabla | Función |
|---|---|
| auth_user | Usuarios y contraseñas con hash |
| auth_group | Grupos |
| auth_permission | Permisos |
| usuarios_perfilusuario | Información complementaria |
| token_blacklist_outstandingtoken | Refresh tokens emitidos |
| token_blacklist_blacklistedtoken | Refresh tokens revocados |

```sql
SELECT id, username, email, is_active FROM auth_user;
```

> **Importante:** JWT no guarda cada access token en SQL Server. Las tablas de blacklist administran solo los **refresh tokens**.

---

## 9. Fase 5. Serializers y vistas

### `usuarios/serializers.py`

```python
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from .models import PerfilUsuario


class RegistroSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    identificacion = serializers.CharField(max_length=20)
    telefono = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True
    )

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("El usuario ya existe.")
        return value

    def validate_identificacion(self, value):
        if PerfilUsuario.objects.filter(identificacion=value).exists():
            raise serializers.ValidationError("La identificación ya existe.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        with transaction.atomic():
            usuario = User.objects.create_user(
                username=validated_data["username"],
                email=validated_data["email"],
                password=validated_data["password"]  # create_user aplica el hash
            )
            PerfilUsuario.objects.create(
                usuario=usuario,
                identificacion=validated_data["identificacion"],
                telefono=validated_data.get("telefono", "")
            )
        return usuario
```

### `usuarios/views.py`

```python
from django.shortcuts import render
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from .serializers import RegistroSerializer


class RegistroView(generics.CreateAPIView):
    serializer_class = RegistroSerializer
    permission_classes = [AllowAny]


class PerfilView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = request.user
        return Response({
            "id": usuario.id,
            "username": usuario.username,
            "email": usuario.email,
            "mensaje": "Acceso autorizado mediante JWT"
        })


def login_pagina(request):
    return render(request, "usuarios/login.html")


def registro_pagina(request):
    return render(request, "usuarios/registro.html")


def panel_pagina(request):
    return render(request, "usuarios/panel.html")
```

Las vistas HTML solo entregan páginas. La protección real está en `PerfilView`, que exige un JWT válido.

---

## 10. Fase 6. Rutas

### `usuarios/urls.py`

```python
from django.urls import path
from .views import (
    RegistroView,
    PerfilView,
    login_pagina,
    registro_pagina,
    panel_pagina,
)

urlpatterns = [
    path("", login_pagina, name="login"),
    path("registro/", registro_pagina, name="registro"),
    path("panel/", panel_pagina, name="panel"),
    path("api/registro/", RegistroView.as_view(), name="api_registro"),
    path("api/perfil/", PerfilView.as_view(), name="api_perfil"),
]
```

### `config/urls.py`

```python
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenBlacklistView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("usuarios.urls")),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/token/blacklist/", TokenBlacklistView.as_view(), name="token_blacklist"),
]
```

---

## 11. Fase 7. Templates HTML

Estructura:

```
usuarios/
└── templates/
    └── usuarios/
        ├── login.html
        ├── registro.html
        └── panel.html
```

### `usuarios/templates/usuarios/login.html` (versión funcional)

Login y panel en la misma página; el token vive en variables JavaScript (no en localStorage, sessionStorage ni URL).

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Autenticación JWT - SENA</title>
</head>
<body>
  <h1>Sistema de autenticación - SENA</h1>

  <section id="seccionLogin">
    <h2>Iniciar sesión</h2>
    <form id="formLogin">
      <input id="usuario" placeholder="Usuario" required>
      <input id="clave" type="password" placeholder="Contraseña" required>
      <button type="submit">Ingresar</button>
    </form>
    <a href="/registro/">Registrarse</a>
  </section>

  <section id="seccionPanel" hidden>
    <h2>Panel de usuario</h2>
    <p id="datosUsuario"></p>
    <button id="salir">Cerrar sesión</button>
  </section>

  <p id="mensaje"></p>

  <script>
    let accessToken = null;
    let refreshToken = null;

    const login = document.getElementById("seccionLogin");
    const panel = document.getElementById("seccionPanel");
    const mensaje = document.getElementById("mensaje");

    document.getElementById("formLogin")
      .addEventListener("submit", async (event) => {
        event.preventDefault();

        const respuesta = await fetch("/api/token/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: document.getElementById("usuario").value,
            password: document.getElementById("clave").value
          })
        });

        if (!respuesta.ok) {
          mensaje.textContent = "Usuario o contraseña incorrectos";
          return;
        }

        const datos = await respuesta.json();
        accessToken = datos.access;
        refreshToken = datos.refresh;
        await cargarPerfil();
      });

    async function cargarPerfil() {
      const respuesta = await fetch("/api/perfil/", {
        headers: { "Authorization": "Bearer " + accessToken }
      });

      if (!respuesta.ok) {
        mensaje.textContent = "No fue posible validar el acceso";
        return;
      }

      const datos = await respuesta.json();
      login.hidden = true;
      panel.hidden = false;
      mensaje.textContent = "";
      document.getElementById("datosUsuario").textContent =
        "Bienvenido: " + datos.username + " | Correo: " + datos.email;
    }

    document.getElementById("salir")
      .addEventListener("click", async () => {
        if (refreshToken) {
          try {
            await fetch("/api/token/blacklist/", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh: refreshToken })
            });
          } catch (error) {
            mensaje.textContent = "No se pudo confirmar la revocación";
          }
        }
        accessToken = null;
        refreshToken = null;
        panel.hidden = true;
        login.hidden = false;
        document.getElementById("clave").value = "";
      });
  </script>
</body>
</html>
```

Al recargar la página se pierden los tokens en memoria y hay que iniciar sesión de nuevo (comportamiento esperado en esta práctica).

### `usuarios/templates/usuarios/registro.html`

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Registro de usuarios</title>
</head>
<body>
  <h2>Registrar usuario</h2>

  <form id="registroForm">
    <input id="username" placeholder="Usuario" required>
    <input id="email" type="email" placeholder="Correo" required>
    <input id="identificacion" placeholder="Identificación" required>
    <input id="telefono" placeholder="Teléfono">
    <input id="password" type="password" placeholder="Contraseña" required>
    <button type="submit">Registrar</button>
  </form>

  <p id="mensaje"></p>

  <script>
    document.getElementById("registroForm")
      .addEventListener("submit", async (event) => {
        event.preventDefault();

        const datos = {
          username: document.getElementById("username").value,
          email: document.getElementById("email").value,
          identificacion: document.getElementById("identificacion").value,
          telefono: document.getElementById("telefono").value,
          password: document.getElementById("password").value
        };

        const respuesta = await fetch("/api/registro/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datos)
        });

        if (respuesta.ok) {
          window.location.href = "/";
        } else {
          const error = await respuesta.json();
          document.getElementById("mensaje").textContent = JSON.stringify(error);
        }
      });
  </script>
</body>
</html>
```

### `usuarios/templates/usuarios/panel.html` (ejercicio de diseño)

Es solo una plantilla de apoyo; la página funcional es `login.html`. Sin datos sensibles renderizados.

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Panel - SENA</title>
</head>
<body>
  <h1>Panel</h1>
  <p>Ejercicio de diseño. El acceso real se valida en <code>/api/perfil/</code> con JWT.</p>
  <a href="/">Volver</a>
</body>
</html>
```

---

## 12. Fase 8. Django Admin

### `usuarios/admin.py`

```python
from django.contrib import admin
from .models import PerfilUsuario


@admin.register(PerfilUsuario)
class PerfilUsuarioAdmin(admin.ModelAdmin):
    list_display = ("usuario", "identificacion", "telefono", "programa")
    search_fields = ("usuario__username", "identificacion")
```

```bash
python manage.py createsuperuser
python manage.py runserver
```

Admin: <http://127.0.0.1:8000/admin/>

> Los usuarios creados desde el Admin **no** tienen `PerfilUsuario` automáticamente; este se crea con el endpoint de registro.

---

## 13. Fase 9. Pruebas

### Flujo

1. Ir a <http://127.0.0.1:8000/registro/> y crear un usuario.
2. Verificar en SQL Server que existe en `auth_user` y `usuarios_perfilusuario`.
3. Iniciar sesión desde el formulario.
4. Comprobar que `/api/token/` devuelve `access` y `refresh`.
5. Comprobar que el panel muestra el usuario autenticado.
6. Cerrar sesión y verificar que ya no se puede consultar el perfil.

### Endpoints

| Endpoint | Método | Resultado esperado |
|---|---|---|
| `/api/registro/` | POST | Crear usuario |
| `/api/token/` | POST | Obtener access y refresh |
| `/api/perfil/` | GET | Datos del usuario autenticado |
| `/api/token/refresh/` | POST | Renovar access token |
| `/api/token/blacklist/` | POST | Revocar refresh token |

Solicitud de login:

```json
{
  "username": "aprendiz1",
  "password": "ContraseñaSegura123!"
}
```

Respuesta esperada:

```json
{
  "refresh": "<token_de_renovacion>",
  "access": "<token_de_acceso>"
}
```

### Prueba rápida con curl

```bash
# Registro
curl -X POST http://127.0.0.1:8000/api/registro/ \
  -H "Content-Type: application/json" \
  -d '{"username":"aprendiz1","email":"a@correo.com","identificacion":"123","password":"ContraseñaSegura123!"}'

# Login
curl -X POST http://127.0.0.1:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"aprendiz1","password":"ContraseñaSegura123!"}'

# Perfil protegido (sin token debe responder 401)
curl http://127.0.0.1:8000/api/perfil/
curl http://127.0.0.1:8000/api/perfil/ -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Verificar datos en SQL Server

```sql
USE SenaJWT;
SELECT u.id, u.username, u.email, p.identificacion, p.telefono, p.programa
FROM auth_user AS u
INNER JOIN usuarios_perfilusuario AS p ON u.id = p.usuario_id;
```

---

## 14. Fase 10. Actividad práctica

**Situación problema:** el SENA necesita un módulo de autenticación para una plataforma académica con registro y acceso de **aprendices e instructores**.

Los aprendices deben:

- Agregar un campo `rol` al perfil con valores `APRENDIZ` e `INSTRUCTOR`.
- Mostrar el rol en el panel.
- Probar el acceso con distintos usuarios.
- Distinguir entre **mostrar** un rol y **autorizar** según el rol: la autorización se comprueba **en el backend**, no solo con JavaScript.

### Guía de solución (referencia para el instructor)

**1. Modelo** (`usuarios/models.py`):

```python
class PerfilUsuario(models.Model):
    class Rol(models.TextChoices):
        APRENDIZ = "APRENDIZ", "Aprendiz"
        INSTRUCTOR = "INSTRUCTOR", "Instructor"

    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="perfil"
    )
    identificacion = models.CharField(max_length=20, unique=True)
    telefono = models.CharField(max_length=20, blank=True)
    programa = models.CharField(max_length=100, default="ADSO")
    rol = models.CharField(max_length=20, choices=Rol.choices, default=Rol.APRENDIZ)

    def __str__(self):
        return self.usuario.username
```

```bash
python manage.py makemigrations usuarios
python manage.py migrate
```

**2. Serializer:** agregar `rol` al `RegistroSerializer`.

> ⚠️ Seguridad: si permites elegir el rol libremente en el registro público, cualquiera podría registrarse como instructor. Para la práctica puede servir; en un sistema real, el rol `INSTRUCTOR` lo debe asignar un administrador.

```python
rol = serializers.ChoiceField(
    choices=PerfilUsuario.Rol.choices,
    default=PerfilUsuario.Rol.APRENDIZ
)
# y en create(): rol=validated_data.get("rol", PerfilUsuario.Rol.APRENDIZ)
```

**3. Mostrar el rol:** en `PerfilView.get` agregar al `Response`:

```python
"rol": usuario.perfil.rol,
```

y en `login.html` mostrar `datos.rol` en `datosUsuario`.

**4. Autorizar en el backend** (`usuarios/permissions.py`):

```python
from rest_framework.permissions import BasePermission


class EsInstructor(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return (
            user.is_authenticated
            and hasattr(user, "perfil")
            and user.perfil.rol == "INSTRUCTOR"
        )
```

Vista protegida solo para instructores:

```python
from rest_framework.permissions import IsAuthenticated
from .permissions import EsInstructor


class ZonaInstructorView(APIView):
    permission_classes = [IsAuthenticated, EsInstructor]

    def get(self, request):
        return Response({"mensaje": "Solo instructores pueden ver esto"})
```

Ruta: `path("api/instructor/", ZonaInstructorView.as_view(), name="api_instructor")`.
Un aprendiz debe recibir **403 Forbidden**.

### Entregables

- Proyecto Django con código fuente.
- Modelo `PerfilUsuario` ampliado.
- Archivos de migraciones.
- Templates de registro e inicio de sesión.
- Endpoints de autenticación JWT.
- Evidencias de las tablas creadas en SQL Server.
- Capturas de las pruebas de registro, inicio y cierre de sesión.
- Documento breve que explique el funcionamiento de JWT y Django ORM.

---

## 15. Lista de chequeo

- [ ] El entorno virtual funciona y Django está instalado.
- [ ] Django establece conexión con SQL Server.
- [ ] El modelo `PerfilUsuario` se creó correctamente.
- [ ] Las migraciones se aplicaron en SQL Server.
- [ ] El registro crea usuarios con contraseñas protegidas.
- [ ] El inicio de sesión genera tokens JWT.
- [ ] El endpoint protegido rechaza solicitudes sin token.
- [ ] El panel presenta la información del usuario autenticado.
- [ ] El cierre de sesión revoca el refresh token.
- [ ] El aprendiz entrega evidencias y explica el proceso.

---

## 16. Seguridad y producción

Esta es una práctica educativa, **no** una implementación lista para producción. Para sistemas reales agrega:

- HTTPS obligatorio.
- Protección contra intentos repetidos de inicio de sesión (rate limiting).
- Validación de correo y recuperación de contraseña.
- Manejo seguro de secretos (`SECRET_KEY`, credenciales de BD).
- Pruebas automatizadas.

Revocar el refresh token impide reutilizarlo, pero **no invalida un access token ya emitido**; por eso los access tokens tienen vida corta (15 min). En producción web conviene un patrón *backend-for-frontend* con cookies `HttpOnly`, `Secure` y `SameSite`, más protección CSRF.

---

## 17. Conclusión

Cada componente tiene su responsabilidad: los **modelos** definen los datos, las **migraciones** crean las estructuras, las **vistas** procesan solicitudes, los **templates** presentan la interfaz y **JWT** autentica el acceso a los recursos protegidos.

## Referencias

- Documentación oficial de Django
- Microsoft: integración Django con SQL Server (`mssql-django`)
- Documentación de Simple JWT
