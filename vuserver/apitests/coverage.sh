#!/bin/sh

set -ex
pwd
if [ -d "gotests" ];then
    rm -rf gotests
fi
if [ -f "htmlcov.tar" ];then
    rm -f htmlcov.tar
fi
mkdir gotests

cp -r apitests gotests/tests

cd vuserver
if [ -d "decc" ];then
    rm -rf decc
fi
if [ -d "assets" ];then
    rm -rf assets
fi
if [ -d "coverage-data" ];then
    rm -rf coverage-data
fi
if [ -d "static" ];then
    rm -rf static
fi
#if [ -d "templates" ];then
#    rm -rf templates
#fi
if [ -d "log" ];then
    rm -rf log
fi
if [ -f "db.sqlite3" ];then
    rm -f "db.sqlite3"
fi

if [ -f ".coveragedata" ];then
    rm -f ".coveragedata"
fi

cp -f docker-compose-test.yaml ../.
cp -f Dockerfile-test ../.
cp -f Dockerfile-server ../.
#cp -f server.py ../.
mv -f ../gotests/tests/server.py ../.
cp -f requirements-test.txt ../.

cd ..
cp -r vuserver gotests/.
#docker-compose -f docker-compose-test.yaml up --build
docker-compose -f docker-compose-test.yaml up --build -d

sleep 5

bash gotests/tests/getcoverage.sh

docker-compose -f docker-compose-test.yaml stop

#docker-compose -f docker-compose-test.yaml stop

