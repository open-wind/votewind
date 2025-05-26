sudo -u postgres psql -c "CREATE ROLE votewind WITH LOGIN PASSWORD 'password';"
sudo -u postgres createdb -O votewind votewind
sudo -u postgres psql -d votewind -c 'CREATE EXTENSION postgis;'
sudo -u postgres psql -d votewind -c 'CREATE EXTENSION postgis_raster;'
sudo -u postgres psql -d votewind -c 'GRANT ALL PRIVILEGES ON DATABASE votewind TO votewind;'
