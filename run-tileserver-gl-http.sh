#! /bin/bash -l

export LD_LIBRARY_PATH=/opt/lib:$LD_LIBRARY_PATH
export PKG_CONFIG_PATH=/opt/lib/pkgconfig:$PKG_CONFIG_PATH
export EXTERNAL_IP=$(curl ipinfo.io/ip)
export PUBLIC_URL=http://tiles.votewind.org

# For basic testing
#xvfb-run --server-args="-screen 0 1024x768x24" tileserver-gl -p 8081 --public_url ${PUBLIC_URL}

# For live
xvfb-run --server-num=100 --server-args="-screen 0 1024x768x24" tileserver-gl -p 8081 --public_url ${PUBLIC_URL} --config /usr/src/votewind/tileserver/config.json

