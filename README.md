# Autenticación JWT con Django y SQL Server (SENA – ADSO)

Proyecto listo para ejecutar. La explicación paso a paso está en `guia_jwt_django_sqlserver.md`.

## Puesta en marcha

1. Crear la base de datos en SQL Server:

   ```sql
   CREATE DATABASE SenaJWT;
   ```

   Crear un usuario SQL con permisos sobre esa base (no usar `sa`) e instalar el
   controlador **ODBC Driver 18 for SQL Server**.

2. Entorno virtual e instalación:

   ```bash
   python3 -m venv entorno
   source entorno/bin/activate        # Windows: .\entorno\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   ```

3. Variables de entorno: copiar `.env.example` a `.env` y completar las credenciales.

   ```bash
   cp .env.example .env               # Windows: copy .env.example .env
   ```

4. Migraciones (la primera genera la migración del modelo `PerfilUsuario`):

   ```bash
   python manage.py check
   python manage.py makemigrations usuarios
   python manage.py migrate
   ```

5. Superusuario y servidor:

   ```bash
   python manage.py createsuperuser
   python manage.py runserver
   ```

## Rutas

| Ruta | Descripción |
|---|---|
| `/` | Login + panel (JWT en memoria) |
| `/registro/` | Registro de usuarios |
| `/admin/` | Django Admin |
| `/api/registro/` | POST – crear usuario |
| `/api/token/` | POST – obtener access y refresh |
| `/api/token/refresh/` | POST – renovar access |
| `/api/token/blacklist/` | POST – revocar refresh |
| `/api/perfil/` | GET – perfil (requiere JWT) |

## Actividad

Agregar el campo `rol` (APRENDIZ / INSTRUCTOR) al perfil y autorizar en el backend.
Ver la sección 14 de la guía.
