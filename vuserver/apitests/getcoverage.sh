#!/usr/bin/env bash
#set -xv

basepath=$(cd `dirname $0` || exit; pwd)
echo "$basepath"
cd "$basepath" || exit
pwd
cd ../..
if [ -d "venv" ]; then
  source ./venv/bin/activate
  if (( $? != 0 )) ;then
    rm -rf venv
    python37 -m virtualenv venv
    source ./venv/bin/activate
  fi
else
  python37 -m virtualenv venv
  source ./venv/bin/activate
fi
cd ./gotests/vuserver
pwd
if [ -f "db.sqlite3" ];then
    rm -f "db.sqlite3"
fi

if [ -f ".coveragedata" ];then
    rm -f ".coveragedata"
fi


#pip3 install -r requirements.txt >> /dev/null
pip install --upgrade pip
echo "pip install -r requirements-test.txt"
pip install -i http://mirrors.aliyun.com/pypi/simple --trusted-host mirrors.aliyun.com -r ../../requirements-test.txt >> /dev/null
python manage.py migrate --settings=vuserver.settings.test
ipaddr=$(ifconfig -a|grep inet|grep -v 127.0.0.1|grep -v inet6|awk '{print $2}'|tr -d "addr:" | grep "10.")
echo "$ipaddr"
coverage erase
REDIS_HOST=127.0.0.1 LOCALHOST_IP=$ipaddr coverage run --source=../vuserver --rcfile=.coveragerc --data-file=.coveragedata manage.py runserver --noreload 0.0.0.0:9100  --settings=vuserver.settings.test &
sleep 5
cd ..
pytest -vv tests --html=./tests/all.html
sleep 5
kill $( ps aux | grep '0.0.0.0:9100' |grep 'Sl' | awk '{print $2}')
#kill $( ps aux | grep '0.0.0.0:9000' |grep 'Sl+' | awk '{print $2}')
curl -s "http://127.0.0.1:9100/parallel/shutdownforcodecoverage/"
pwd
cd ./vuserver
coverage report --data-file=.coveragedata
sleep 5
coverage html --data-file=.coveragedata --directory=../../htmlcov

sleep 5
kill -9 $(pgrep -f 9100)
deactivate
docker-compose -f ../../docker-compose-test.yaml stop
cd ../../.
pwd
tar -cvf htmlcov.tar htmlcov
sleep 5
rm -rf htmlcov
#kill -9 $(pgrep -f 9100)
