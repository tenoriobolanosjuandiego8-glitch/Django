from django.urls import path

from .views import (
    PerfilView,
    RegistroView,
    login_pagina,
    panel_pagina,
    registro_pagina,
)

urlpatterns = [
    path('', login_pagina, name='login'),
    path('registro/', registro_pagina, name='registro'),
    path('panel/', panel_pagina, name='panel'),
    path('api/registro/', RegistroView.as_view(), name='api_registro'),
    path('api/perfil/', PerfilView.as_view(), name='api_perfil'),
]