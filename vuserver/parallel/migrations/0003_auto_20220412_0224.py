# Generated by Django 2.2.26 on 2022-04-12 02:24

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('parallel', '0002_auto_20220412_0214'),
    ]

    operations = [
        migrations.AlterField(
            model_name='console',
            name='expiretime',
            field=models.DateTimeField(blank=True, default=datetime.datetime(2022, 7, 11, 2, 24, 46, 475261), verbose_name='Expire Time'),
        ),
    ]