#!/bin/bash

cd  /opt/vmprojects/tawa/vuserver || exit
git pull
docker-compose -f docker-compose-staging.yaml up -d --build app