import json

from django.test import TestCase
from django.urls import reverse


class AuthenticationPagesTests(TestCase):
	def test_authentication_pages_render(self):
		pages = (
			('login', 'usuarios/login.html'),
			('registro', 'usuarios/registro.html'),
			('panel', 'usuarios/panel.html'),
		)

		for route_name, template_name in pages:
			with self.subTest(page=route_name):
				response = self.client.get(reverse(route_name))
				self.assertEqual(response.status_code, 200)
				self.assertTemplateUsed(response, template_name)

	def test_register_login_refresh_and_load_profile(self):
		registration = self.client.post(
			reverse('api_registro'),
			data=json.dumps(
				{
					'username': 'flow-user',
					'email': 'flow-user@example.test',
					'password': 'StrongFlowPass!9382',
					'identificacion': 'FLOW-0001',
					'telefono': '',
				}
			),
			content_type='application/json',
		)
		self.assertEqual(registration.status_code, 201, registration.content)

		login = self.client.post(
			reverse('token_obtain_pair'),
			data=json.dumps(
				{
					'username': 'flow-user',
					'password': 'StrongFlowPass!9382',
				}
			),
			content_type='application/json',
		)
		self.assertEqual(login.status_code, 200, login.content)

		tokens = login.json()
		profile = self.client.get(
			reverse('api_perfil'),
			HTTP_AUTHORIZATION=f"Bearer {tokens['access']}",
		)
		self.assertEqual(profile.status_code, 200, profile.content)
		self.assertEqual(profile.json()['username'], 'flow-user')

		refreshed = self.client.post(
			reverse('token_refresh'),
			data=json.dumps({'refresh': tokens['refresh']}),
			content_type='application/json',
		)
		self.assertEqual(refreshed.status_code, 200, refreshed.content)
		self.assertIn('access', refreshed.json())
