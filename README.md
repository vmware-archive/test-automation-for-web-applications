# Test Automation for Web Applications(TAWA)

TAWA is a next generation tool for automated testing of web applications. Based on container technology and a browser extension, it provides 2 core functions:

* Web UI Test Recording enable user to recorder their operations on web UI easily. Depends on a default script template, TAWA will generate event list, screenshots, as well as automation script automatically during recording. User can download the script and replay recorded steps quickly.
* Parallel Testing is to test one web user interface in multiple browsers simultaneously. During the test, user operates on a leader browser, TAWA will drive multiple worker browsers which follow user's operation, make sure all browsers in same page. For Globalization testing, the work browsers can open the web application in different locales based on user's configuration. It can also be used to capture multiple languages/resolutions screenshots easily.

## Deployment Steps

### Install base tools

* docker
* docker-composer v2
* python3.7+
* redis
* nodeJS + npm
* angular

### Clone tawa codes

* git clone https://github.com/vmware/test-automation-for-web-applications.git tawa

### Create virtual environment by virtualenv

* pip3 install virtualenv
* cd ~/; virtualenv env
* source ~/env/bin/activate
* cd tawa/vuserver; pip install -r requirements.txt

*Your Directory structure will look like this:*

```
/root
├── env
├── tawa
│   ├── vuserver
|   ├── vuportal
|   ├── workers
```

### build worker image

* cd tawa/workers/parallel;docker build -t localhost:5000/parallel:master .

### Start vuserver on local

* cd tawa/vuserver; python manage.py migrate --settings=vuserver.settings.local
* Change LOCALHOST_IP in vuserver/settings/local.py
* Change REDIS_HOST,REDIS_PORT,REDIS_PASSWORD,REDIS_DB in vuserver/settings/base.py
* [REDIS_HOST=192.168.0.1 REDIS_PASSWORD=vmware]python manage.py runserver 0.0.0.0:9100 --settings=vuserver.settings.local
* [optional]python manage.py createsuperuser --settings=vuserver.settings.local

### Start frontend

* cd tawa/vuportal; npm install
* The default API URL value is [http://locahost:9100](http://locahost:9100). If you setup the backend environment on a specific host, please replace localhost with specific host ip on ./src/environments/environment.ts, such as below:
  * testApiUrl : "http://<local_ip>:9100"
* Start frontend by: cd to tawa/vuportal; ng serve
* Open frontend by browser: http://<local_ip>:4200

### Contribute

The test-automation-for-web-applications project team welcomes contributions from the community. If you wish to contribute code and you have not signed our [contributor license agreement](https://cla.vmware.com/cla/1/preview), our bot will update the issue when you open a Pull Request. For any questions about the CLA process, please refer to our [FAQ](https://cla.vmware.com/faq).
