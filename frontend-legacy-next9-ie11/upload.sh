./deploy.sh
rsync -avz --delete -e "ssh -i ~/.ssh/stefanhaselwimmer_rsa" out/ root@votewind.org:/var/www/test/
# rsync -avz --delete -e "ssh -i ~/.ssh/stefanhaselwimmer_rsa" out/ root@votewind.org:/usr/src/votewind/static-frontend-legacy/
