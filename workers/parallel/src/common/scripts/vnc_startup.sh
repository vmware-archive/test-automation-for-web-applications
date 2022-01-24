#!/bin/bash
### every exit != 0 fails the script
set -e

# should also source $STARTUPDIR/generate_container_user
source $HOME/.bashrc

# add `--skip` to startup args, to skip the VNC startup procedure
if [[ $1 =~ --skip ]]; then
    echo -e "\n\n------------------ SKIP VNC STARTUP -----------------"
    echo -e "\n\n------------------ EXECUTE COMMAND ------------------"
    echo "Executing command: '${@:2}'"
    exec "${@:2}"
fi

## write correct window size to chrome properties
$STARTUPDIR/chrome-init.sh

## write correct window size to firefox properties
# $STARTUPDIR/firefox-init.sh

## resolve_vnc_connection
VNC_IP=$(ip addr show eth0 | grep -Po 'inet \K[\d.]+')

## change vnc password
echo -e "\n------------------ change VNC password  ------------------"
(echo $VNC_PW && echo $VNC_PW) | vncpasswd

# VNC_DPI=200
VNC_WIDTH=`echo $VNC_RESOLUTION | cut -d"x" -f 1`
VNC_HEIGHT=`echo $VNC_RESOLUTION | cut -d"x" -f 2`

# if [[ $VNC_WIDTH -gt 1400 ]]; then
#     VNC_DPI=250
# fi
## start vncserver and noVNC webclient
/usr/bin/pulseaudio --disallow-module-loading -vvvv --disallow-exit --exit-idle-time=-1 &
tcpserver localhost 9901 gst-launch-1.0 -q pulsesrc server=/tmp/pulseaudio.socket ! audio/x-raw, channels=2, rate=24000 ! cutter ! opusenc ! webmmux ! fdsink fd=1 &

$NO_VNC_HOME/utils/launch.sh --vnc $VNC_IP:$VNC_PORT --listen $NO_VNC_PORT --cert /crt/vtaas.pem &
$NO_VNC_HOME/utils/launch.sh --vnc $VNC_IP:9901 --listen 9901 --cert /crt/vtaas.pem &
vncserver -kill :1 || rm -rfv /tmp/.X*-lock /tmp/.X11-unix || echo "remove old vnc locks to be a reattachable container"
vncserver $DISPLAY -depth $VNC_COL_DEPTH -geometry $VNC_RESOLUTION -name $VNC_NAME
$HOME/wm_startup.sh

VNC_RES_W=${VNC_RESOLUTION%x*}
VNC_RES_H=${VNC_RESOLUTION#*x}
VNC_RES_W=$[VNC_RES_W-0]
VNC_RES_H=$[VNC_RES_H-31]
if [ "$BROWSER_TYPE" == "Chrome" ]; then
    echo -e "\n\n------------------ Start chrome ------------------"
    # LANGUAGE=$BROWSER_LOCALE /usr/bin/google-chrome --silent-debugger-extension-api --always-authorize-plugins --allow-outdated-plugins --disable-sync --no-first-run --test-type --ignore-certificate-errors --disable-extensions-http-throttling --allow-file-access-from-files --disable-web-security --user-data-dir=~/Documents/ --start-maximized --lang=$CHROME_LOCALE --load-extension=/ext
    LANGUAGE=$BROWSER_LOCALE /usr/bin/google-chrome --silent-debugger-extension-api --always-authorize-plugins --allow-outdated-plugins --disable-sync --no-first-run --test-type --ignore-certificate-errors --disable-extensions-http-throttling --allow-file-access-from-files --disable-web-security --user-data-dir=~/Documents/ --window-size=$VNC_RES_W,$VNC_RES_H --window-position=0,0 --lang=$CHROME_LOCALE --load-extension=/ext
    echo -e "\n\n------------------ Chrome started ------------------"
else
    echo -e "Not supported"
fi

## log connect options
echo -e "\n\n------------------ VNC environment started ------------------"
echo -e "\nVNCSERVER started on DISPLAY= $DISPLAY \n\t=> connect via VNC viewer with $VNC_IP:$VNC_PORT"
echo -e "\nnoVNC HTML client started:\n\t=> connect via http://$VNC_IP:$NO_VNC_PORT/?password=...\n"

if [[ $1 =~ -t|--tail-log ]]; then
    # if option `-t` or `--tail-log` block the execution and tail the VNC log
    echo -e "\n------------------ $HOME/.vnc/*$DISPLAY.log ------------------"
    tail -f $HOME/.vnc/*$DISPLAY.log
elif [ -z "$1" ] ; then
    echo -e "..."
else
    # unknown option ==> call command
    echo -e "\n\n------------------ EXECUTE COMMAND ------------------"
    echo "Executing command: '$@'"
    exec "$@"
fi

#python $INST_SCRIPTS/ssl_enable.py $CHROME_LOCALE
