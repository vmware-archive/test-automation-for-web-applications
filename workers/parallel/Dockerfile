# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

FROM ubuntu:16.04

MAINTAINER vTaaS "etcp-dev@vmware.com"
ENV REFRESHED_AT 2022-01-07

## Connection ports for controlling the UI:
# VNC port:5901
# noVNC webport, connect via http://IP:6901/?password=vncpassword
ENV DISPLAY :1
ENV VNC_PORT 5901
ENV NO_VNC_PORT 6901
EXPOSE $VNC_PORT $NO_VNC_PORT

ENV HOME /headless
ENV STARTUPDIR /dockerstartup
WORKDIR $HOME

### Envrionment config
ENV DEBIAN_FRONTEND noninteractive
ENV NO_VNC_HOME $HOME/noVNC
ENV VNC_COL_DEPTH 24
ENV VNC_RESOLUTION 1280x1024
ENV VNC_PW vncpassword

### Add all install scripts for further steps
ENV INST_SCRIPTS $HOME/install
ADD ./src/common/install/ $INST_SCRIPTS/
ADD ./src/ubuntu/install/ $INST_SCRIPTS/
RUN find $INST_SCRIPTS -name '*.py' -exec chmod a+x {} +
RUN find $INST_SCRIPTS -name '*.sh' -exec chmod a+x {} +

### Install some common tools
RUN $INST_SCRIPTS/tools.sh

### Install xvnc-server & noVNC - HTML5 based VNC viewer
RUN $INST_SCRIPTS/tigervnc.sh
RUN $INST_SCRIPTS/no_vnc.sh

### Install firfox and chrome browser
RUN pwd
RUN $INST_SCRIPTS/firefox.sh
RUN $INST_SCRIPTS/chrome.sh

### Install xfce UI
RUN $INST_SCRIPTS/xfce_ui.sh
ADD ./src/common/xfce/ $HOME/

### xstartup
ADD ./src/ubuntu/.vnc/xstartup $HOME/.vnc/

### configure startup
RUN $INST_SCRIPTS/libnss_wrapper.sh
ADD ./src/common/scripts $STARTUPDIR
RUN $INST_SCRIPTS/set_user_permission.sh $STARTUPDIR $HOME


### Install java
RUN wget https://d3pxv6yz143wms.cloudfront.net/8.212.04.2/java-1.8.0-amazon-corretto-jdk_8.212.04-2_amd64.deb && \
    apt-get update && apt-get install java-common && apt-get install -y --no-install-recommends apt-utils && \
    dpkg --install java-1.8.0-amazon-corretto-jdk_8.212.04-2_amd64.deb && rm java-1.8.0-amazon-corretto-jdk_8.212.04-2_amd64.deb

RUN apt-get update && apt-get install -y --fix-missing \
    gstreamer1.0-plugins-good \
    gstreamer1.0-pulseaudio \
    gstreamer1.0-tools \
    libglu1-mesa \
    libgtk2.0-0 \
    libncursesw5 \
    libopenal1 \
    libsdl-image1.2 \
    libsdl-ttf2.0-0 \
    libsdl1.2debian \
    libsndfile1 \
    pulseaudio \
    supervisor \
    ucspi-tcp && \
    apt-get clean


### chrome startup
RUN pwd
ENV EXT_DIR /ext
ENV BROWSER_LOCALE zh_CN
ADD ./src/ext $EXT_DIR
RUN $INST_SCRIPTS/set_user_permission.sh $EXT_DIR

RUN pwd

### add crt
ENV  CRT_DIR /crt
ADD ./src/crt $CRT_DIR

USER 1984

ENTRYPOINT ["/dockerstartup/vnc_startup.sh"]
CMD ["--tail-log"]
