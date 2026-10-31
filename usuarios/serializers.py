from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from .models import PerfilUsuario


class RegistroSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    identificacion = serializers.CharField(max_length=20, write_only=True)
    telefono = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
        write_only=True,
    )

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('El usuario ya existe.')
        return value

    def validate_identificacion(self, value):
        if PerfilUsuario.objects.filter(identificacion=value).exists():
            raise serializers.ValidationError('La identificación ya existe.')
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        with transaction.atomic():
            usuario = User.objects.create_user(
                username=validated_data['username'],
                email=validated_data['email'],
                password=validated_data['password'],
            )
            PerfilUsuario.objects.create(
                usuario=usuario,
                identificacion=validated_data['identificacion'],
                telefono=validated_data.get('telefono', ''),
            )

        return usuario