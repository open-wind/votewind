./deploy.sh
rsync -avz --delete  -i ~/.ssh/stefanhaselwimmer_rsa out/ root@votewind.org:/usr/src/votewind/static-frontend/
