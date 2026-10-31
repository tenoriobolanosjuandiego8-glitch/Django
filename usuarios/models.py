from django.conf import settings
from django.db import models


class PerfilUsuario(models.Model):
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='perfil',
    )
    identificacion = models.CharField(max_length=20, unique=True)
    telefono = models.CharField(max_length=20, blank=True)
    programa = models.CharField(max_length=100, default='ADSO')

    def __str__(self):
        return self.usuario.username
