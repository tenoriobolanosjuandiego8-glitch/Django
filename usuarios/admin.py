from django.contrib import admin

from .models import PerfilUsuario


@admin.register(PerfilUsuario)
class PerfilUsuarioAdmin(admin.ModelAdmin):
	list_display = (
		'usuario',
		'identificacion',
		'telefono',
		'programa',
	)
	search_fields = (
		'usuario__username',
		'identificacion',
	)
