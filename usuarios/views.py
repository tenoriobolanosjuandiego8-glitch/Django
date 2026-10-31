from django.shortcuts import render
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RegistroSerializer


class RegistroView(generics.CreateAPIView):
	serializer_class = RegistroSerializer
	permission_classes = [AllowAny]


class PerfilView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		usuario = request.user
		return Response(
			{
				'id': usuario.id,
				'username': usuario.username,
				'email': usuario.email,
				'mensaje': 'Acceso autorizado mediante JWT',
			}
		)


def login_pagina(request):
	return render(request, 'usuarios/login.html')


def registro_pagina(request):
	return render(request, 'usuarios/registro.html')


def panel_pagina(request):
	return render(request, 'usuarios/panel.html')
