#! /bin/bash -l

# Start tileserver-gl


echo "Running tileserver-gl..."


docker run --name openwindenergy-tileserver -d --rm -v $(pwd)/:/data -p 8080:8080 maptiler/tileserver-gl --config config.json


# Run simple webserver

echo -e ""
echo -e "\033[1;34m***********************************************************************\033[0m"
echo -e "\033[1;34m************** OPEN WIND ENERGY - WEB + TILE SERVER RUNNING ***********\033[0m"
echo -e "\033[1;34m***********************************************************************\033[0m"
echo -e ""
echo -e "Open web browser and enter:"
echo -e ""
echo -e "\033[1;94mhttp://localhost:8000/\033[0m"
echo -e ""
echo -e ""

python3 -m http.server 82

# Stop tileserver-gl

echo "Closing tileserver-gl..."

docker kill openwindenergy-tileserver
