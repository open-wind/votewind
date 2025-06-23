#! /bin/bash -l

docker run --name openwindenergy-tileserver -d --rm -v $(pwd)/tileserver/:/data -p 8080:8080 maptiler/tileserver-gl --config config.json

# Run simple webserver

echo -e ""
echo -e "\033[1;34m***********************************************************************\033[0m"
echo -e "\033[1;34m********************* VOTEWIND - TILE SERVER RUNNING ******************\033[0m"
echo -e "\033[1;34m***********************************************************************\033[0m"
echo -e ""
echo -e "Open web browser and enter:"
echo -e ""
echo -e "\033[1;94mhttp://localhost:8080/\033[0m"
echo -e ""
echo -e ""

cd tileserver/app/
python3 -m http.server 8001
cd ../

# Stop tileserver-gl

echo "Closing tileserver-gl..."

docker kill openwindenergy-tileserver
