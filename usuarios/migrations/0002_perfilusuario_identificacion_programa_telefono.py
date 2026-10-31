from django.db import migrations, models


def populate_legacy_identifications(apps, schema_editor):
    perfil_usuario = apps.get_model('usuarios', 'PerfilUsuario')
    database_alias = schema_editor.connection.alias

    for profile in perfil_usuario.objects.using(database_alias).filter(
        identificacion__isnull=True,
    ).iterator():
        profile.identificacion = f'TMP-{profile.pk:X}'
        profile.save(using=database_alias, update_fields=['identificacion'])


class Migration(migrations.Migration):
    dependencies = [
        ('usuarios', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='perfilusuario',
            name='identificacion',
            field=models.CharField(max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='perfilusuario',
            name='programa',
            field=models.CharField(default='ADSO', max_length=100),
        ),
        migrations.AddField(
            model_name='perfilusuario',
            name='telefono',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.RunPython(
            populate_legacy_identifications,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='perfilusuario',
            name='identificacion',
            field=models.CharField(max_length=20, unique=True),
        ),
    ]