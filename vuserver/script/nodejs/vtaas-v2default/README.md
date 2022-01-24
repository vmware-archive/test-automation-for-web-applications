# How to run this script
### Install nodejs and npm from:
* https://nodejs.dev/learn/how-to-install-nodejs

### Install node_modules
* cd . ; npm install
* [**optional**]User other registry if npm install is slow
  - npm install cnpm --registry=https://registry.npm.taobao.org
  - Add node_modules/.bin to PATH
  - cnpm install

### Install Drivers
* npm run installdriver

### Start Selenium Server
* npm run server

### Run script
* [Linux|Mac] source run.sh script/test.spec.js 
* [Windows] run.bat script/test.spec.js
