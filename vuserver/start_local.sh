#!/usr/bin/env bash
docker run --name vuserver_redis -d -p 6379:6379 redis:6
source ~/dj22/bin/activate
python manage.py makemigrations --settings=vuserver.settings.local
python manage.py migrate --settings=vuserver.settings.local
python manage.py runserver 0.0.0.0:9100 --settings=vuserver.settings.local