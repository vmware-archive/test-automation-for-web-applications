#===============
# Google Chrome
#===============
# TODO: Use Google fingerprint to verify downloads
#  https://www.google.de/linuxrepositories/
apt-get -qqy update \
  && apt-get -qqy --no-install-recommends install \
    libfontconfig \
    libfreetype6 \
    xfonts-cyrillic \
    xfonts-scalable \
    fonts-liberation \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    ttf-ubuntu-font-family

# Layer size: huge: 196.3 MB
# && wget -nv "https://dl.google.com/linux/direct/google-chrome-beta_current_amd64.deb" \
# && wget -nv "https://www.slimjet.com/chrome/download-chrome.php?file=lnx%2Fchrome64_66.0.3359.181.deb" \
# https://www.slimjet.com/chrome/download-chrome.php?file=files%2F71.0.3578.80%2Fgoogle-chrome-stable_current_amd64.deb
apt-get -qqy update \
  && mkdir -p chrome-deb \
  && wget -nv "https://www.slimjetbrowser.com/chrome/files/90.0.4430.72/google-chrome-stable_current_amd64.deb" \
          -O "./chrome-deb/google-chrome-stable_current_amd64.deb" \
  && apt-get -qyy --no-install-recommends install \
        "./chrome-deb/google-chrome-stable_current_amd64.deb" \
  && rm "./chrome-deb/google-chrome-stable_current_amd64.deb" \
  && rm -rf ./chrome-deb \
  && apt-get -qyy autoremove \
  && rm -rf /var/lib/apt/lists/* \
  && apt-get -qyy clean


# ln -s /opt/google/chrome/google-chrome /usr/bin/google-chrome
### fix to start chromium in a Docker container, see https://github.com/ConSol/docker-headless-vnc-container/issues/2
# echo "CHROMIUM_FLAGS='--no-sandbox --start-maximized --user-data-dir'" > $HOME/.chromium-browser.init
