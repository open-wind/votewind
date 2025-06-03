#!/bin/bash

sudo timedatectl set-timezone Europe/London

# General function for checking whether services are running

function is_in_activation {
   activation=$(/sbin/service "$1" status | grep "active (running)" )
   if [ -z "$activation" ]; then
      true;
   else
      echo "Running"
      false;
   fi

   return $?;
}

function port_listening {
    if nc -z 127.0.0.1 "$1" >/dev/null ; then
        true;
    else
        false;
    fi

    return $?;
}

# Check whether installation has already been completed before

if [ -f "/usr/src/votewind/INSTALLCOMPLETE" ]; then
   exit 0
fi


# Set up general directories for Vote Wind application

mkdir /usr/src
mkdir /usr/src/votewind

echo '' >> /usr/src/votewind/log.txt
echo '========= STARTING SOFTWARE INSTALLATION =========' >> /usr/src/votewind/log.txt


# Run lengthy apt-get update

echo '' >> /usr/src/votewind/log.txt
echo '********* STAGE 1: Running initial apt update **********' >> /usr/src/votewind/log.txt

sudo apt update -y | tee -a /usr/src/votewind/log.txt

echo '********* STAGE 1: Finished running initial apt update **********' >> /usr/src/votewind/log.txt


# Quickly install Apache2 so user has something to see that updates them with progress

echo '' >> /usr/src/votewind/log.txt
echo '********* STAGE 2: Installing Apache2 **********' >> /usr/src/votewind/log.txt

mkdir /var/www
mkdir /var/www/html
echo '<!doctype html><html><head><meta http-equiv="refresh" content="2"></head><body><pre>Beginning installation of Vote Wind...</pre></body></html>' | sudo tee /var/www/html/index.html
sudo apt install apache2 libapache2-mod-wsgi-py3 -y
sudo apt install certbot python3-certbot-apache -y
sudo a2enmod headers
sudo a2enmod proxy_http
sudo a2enmod rewrite
sudo a2enmod proxy_wstunnel
sudo apache2ctl restart

echo '********* STAGE 2: Finished installing Apache2 **********' >> /usr/src/votewind/log.txt


# Install git

echo '' >> /usr/src/votewind/log.txt
echo '********* STAGE 3: Installing git **********' >> /usr/src/votewind/log.txt

echo '<!doctype html><html><head><meta http-equiv="refresh" content="2"></head><body><pre>Installing git...</pre></body></html>' | sudo tee /var/www/html/index.html
sudo apt install git -y | tee -a /usr/src/votewind/log.txt

echo '********* STAGE 3: Finished installing git **********' >> /usr/src/votewind/log.txt


# Install Vote Wind so log file in right place

echo '' >> /usr/src/votewind/log.txt
echo '********* STAGE 4: Installing Vote Wind source code **********' >> /usr/src/votewind/log.txt

echo '<!doctype html><html><head><meta http-equiv="refresh" content="2"></head><body><pre>Cloning Vote Wind GitHub repo and setting up admin site...</pre></body></html>' | sudo tee /var/www/html/index.html
sudo rm -R /usr/src/votewind
cd /usr/src
git clone https://github.com/open-wind/votewind.git
sudo apt install virtualenv pip -y | tee -a /usr/src/votewind/log.txt
virtualenv -p /usr/bin/python3 /usr/src/votewind/venv | tee -a /usr/src/votewind/log.txt
source /usr/src/votewind/venv/bin/activate
python3 -m pip install -U pip | tee -a /usr/src/votewind/log.txt
python3 -m pip install -U setuptools wheel twine check-wheel-contents | tee -a /usr/src/votewind/log.txt
pip install python-dotenv | tee -a /usr/src/votewind/log.txt
pip install psycopg2-binary | tee -a /usr/src/votewind/log.txt
pip install Jinja2 | tee -a /usr/src/votewind/log.txt
pip install flask | tee -a /usr/src/votewind/log.txt
pip install validators | tee -a /usr/src/votewind/log.txt
sudo chown -R www-data:www-data /usr/src/votewind

echo '********* STAGE 4: Finished installing Vote Wind source code **********' >> /usr/src/votewind/log.txt


echo '********* STAGE 5: Installing nodejs, npm and frontail **********' >> /usr/src/votewind/log.txt

echo '<!doctype html><html><head><meta http-equiv="refresh" content="2"></head><body><pre>Installing nodejs, npm and frontail to show install logs dynamically...</pre></body></html>' | sudo tee /var/www/html/index.html

sudo apt update -y | tee -a /usr/src/votewind/log.txt
sudo apt install curl -y | tee -a /usr/src/votewind/log.txt
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install netcat-traditional nodejs -y | tee -a /usr/src/votewind/log.txt
sudo apt install netcat nodejs -y | tee -a /usr/src/votewind/log.txt
sudo apt install nodejs -y | tee -a /usr/src/votewind/log.txt
sudo apt install npm -y | tee -a /usr/src/votewind/log.txt
npm i frontail -g 2>&1 | tee -a /usr/src/votewind/log.txt

echo "[Unit]
Description=frontail.service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/usr/src/votewind
ExecStart=frontail /usr/src/votewind/log.txt --lines 32000 --ui-hide-topbar --url-path /logs
Restart=on-failure

[Install]
WantedBy=multi-user.target

" | sudo tee /etc/systemd/system/frontail.service >/dev/null


sudo systemctl enable frontail.service
sudo systemctl restart frontail.service

while is_in_activation frontail ; do true; done

echo '********* frontail service running **********' >> /usr/src/votewind/log.txt

while ! port_listening 9001 ; do true; done

echo '********* frontail service listening on port 9001 **********' >> /usr/src/votewind/log.txt                                            


echo '********* STAGE 5: Finished installing nodejs, npm and frontail **********' >> /usr/src/votewind/log.txt


# Install general tools and required libraries

echo '' >> /usr/src/votewind/log.txt
echo '********* STAGE 6: Installing general tools and required libraries **********' >> /usr/src/votewind/log.txt

sudo NEEDRESTART_MODE=a apt install gnupg software-properties-common cmake make g++ dpkg build-essential autoconf pkg-config -y | tee -a /usr/src/votewind/log.txt
sudo NEEDRESTART_MODE=a apt install libbz2-dev libpq-dev libboost-all-dev libgeos-dev libtiff-dev libspatialite-dev -y | tee -a /usr/src/votewind/log.txt
sudo NEEDRESTART_MODE=a apt install libsqlite3-dev libcurl4-gnutls-dev liblua5.4-dev rapidjson-dev libshp-dev libgdal-dev gdal-bin -y | tee -a /usr/src/votewind/log.txt
sudo NEEDRESTART_MODE=a apt install zip unzip lua5.4 shapelib ca-certificates curl nano wget pip proj-bin spatialite-bin sqlite3 -y | tee -a /usr/src/votewind/log.txt
sudo NEEDRESTART_MODE=a apt install xvfb libglfw3-dev libuv1-dev libjpeg-turbo8 libcairo2-dev -y | tee -a /usr/src/votewind/log.txt
sudo NEEDRESTART_MODE=a apt install libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev gir1.2-rsvg-2.0 librsvg2-2 librsvg2-common -y | tee -a /usr/src/votewind/log.txt
sudo NEEDRESTART_MODE=a apt install libcurl4-openssl-dev libpixman-1-dev libpixman-1-0 ccache cmake ninja-build pkg-config xvfb -y | tee -a /usr/src/votewind/log.txt
sudo NEEDRESTART_MODE=a apt install libc++-dev libc++abi-dev libpng-dev -y | tee -a /usr/src/votewind/log.txt
sudo NEEDRESTART_MODE=a apt install libgl1-mesa-dev libgl1-mesa-dri libjpeg-dev -y | tee -a /usr/src/votewind/log.txt
sudo NEEDRESTART_MODE=a apt install php-curl php-gd php-mbstring php-xml php-xmlrpc php-soap php-intl php-zip php libapache2-mod-php -y | tee -a /usr/src/votewind/log.txt


sudo apt update -y | tee -a /usr/src/votewind/log.txt

echo '********* STAGE 6: Finished installing general tools and required libraries **********' >> /usr/src/votewind/log.txt


# Install tileserver-gl

echo '' >> /usr/src/votewind/log.txt
echo '********* STAGE 8: Installing tileserver-gl as system daemon **********' >> /usr/src/votewind/log.txt

wget https://github.com/unicode-org/icu/releases/download/release-70-rc/icu4c-70rc-src.tgz | tee -a /usr/src/votewind/log.txt
tar -xvf icu4c-70rc-src.tgz
sudo rm icu4c-70rc-src.tgz
cd icu/source
./configure --prefix=/opt | tee -a /usr/src/votewind/log.txt
make -j | tee -a /usr/src/votewind/log.txt
sudo make install | tee -a /usr/src/votewind/log.txt

wget http://prdownloads.sourceforge.net/libpng/libpng-1.6.37.tar.gz | tee -a /usr/src/votewind/log.txt
tar -xvf libpng-1.6.37.tar.gz
sudo rm libpng-1.6.37.tar.gz
cd libpng-1.6.37
./configure --prefix=/opt | tee -a /usr/src/votewind/log.txt
make -j | tee -a /usr/src/votewind/log.txt
sudo make install | tee -a /usr/src/votewind/log.txt

sudo ldconfig
export LD_LIBRARY_PATH=/opt/lib:$LD_LIBRARY_PATH
export PKG_CONFIG_PATH=/opt/lib/pkgconfig:$PKG_CONFIG_PATH
sudo chmod -R 777 /usr/local
npm install -g tileserver-gl 2>&1 | tee -a /usr/src/votewind/log.txt
chmod +x /usr/local/bin/tileserver-gl

echo "
[Unit]
Description=TileServer GL
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/usr/src/votewind/
ExecStart=/usr/src/votewind/run-tileserver-gl.sh
Restart=on-failure
Environment=PORT=8080
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target

StandardOutput=file:/var/log/tileserver-output.log
StandardError=file:/var/log/tileserver-error.log
"  | sudo tee /etc/systemd/system/tileserver.service >/dev/null

sudo /usr/bin/systemctl enable tileserver.service

echo '********* STAGE 8: Finished installing tileserver-gl as system daemon **********' >> /usr/src/votewind/log.txt


# Install tilemaker

echo '' >> /usr/src/votewind/log.txt
echo '********* STAGE 9: Installing tilemaker **********' >> /usr/src/votewind/log.txt

sudo NEEDRESTART_MODE=a apt install tilemaker -y | tee -a /usr/src/votewind/log.txt

echo '********* STAGE 9: Finished installing tilemaker **********' >> /usr/src/votewind/log.txt


# Install tippecanoe

echo '' >> /usr/src/votewind/log.txt
echo '********* STAGE 10: Installing tippecanoe **********' >> /usr/src/votewind/log.txt

cd /usr/src/votewind
git clone https://github.com/felt/tippecanoe.git | tee -a /usr/src/votewind/log.txt
cd tippecanoe
make -j | tee -a /usr/src/votewind/log.txt
sudo make install | tee -a /usr/src/votewind/log.txt

echo '********* STAGE 10: Finished installing tippecanoe **********' >> /usr/src/votewind/log.txt


# Install postgis

echo '' >> /usr/src/votewind/log.txt
echo '********* STAGE 11: Installing PostGIS **********' >> /usr/src/votewind/log.txt

sudo apt update -y | tee -a /usr/src/votewind/log.txt
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
sudo curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
sudo apt update -y | tee -a /usr/src/votewind/log.txt
sudo NEEDRESTART_MODE=a apt install postgresql-postgis -y | tee -a /usr/src/votewind/log.txt

echo '********* STAGE 11: Finished installing PostGIS  **********' >> /usr/src/votewind/log.txt


# Install Vote Wind application

echo '' >> /usr/src/votewind/log.txt
echo '********* STAGE 12: Installing Vote Wind **********' >> /usr/src/votewind/log.txt
cd /usr/src/votewind
pip3 install gdal==`gdal-config --version` | tee -a /usr/src/votewind/log.txt
pip3 install -r requirements.txt | tee -a /usr/src/votewind/log.txt
pip3 install git+https://github.com/hotosm/osm-export-tool-python --no-deps | tee -a /usr/src/votewind/log.txt
sudo service postgresql restart | tee -a /usr/src/votewind/log.txt
#sudo -u postgres psql -c "CREATE ROLE votewind WITH LOGIN PASSWORD 'password';" | tee -a /usr/src/votewind/log.txt
#sudo -u postgres createdb -O votewind votewind | tee -a /usr/src/votewind/log.txt
#sudo -u postgres psql -d votewind -c 'CREATE EXTENSION postgis;' | tee -a /usr/src/votewind/log.txt
#sudo -u postgres psql -d votewind -c 'CREATE EXTENSION postgis_raster;' | tee -a /usr/src/votewind/log.txt
#sudo -u postgres psql -d votewind -c 'GRANT ALL PRIVILEGES ON DATABASE votewind TO votewind;' | tee -a /usr/src/votewind/log.txt


echo 'FINISHED' >> /usr/src/votewind/INSTALLCOMPLETE

echo '********* STAGE 12: Finished installing Vote Wind **********' >> /usr/src/votewind/log.txt

echo '' >> /usr/src/votewind/log.txt
echo '===================================================' >> /usr/src/votewind/log.txt
echo '========= STARTUP INSTALLATION COMPLETE ===========' >> /usr/src/votewind/log.txt
echo '===================================================' >> /usr/src/votewind/log.txt
echo '' >> /usr/src/votewind/log.txt


