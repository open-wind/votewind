./deploy.sh
rsync -avz --delete -e "ssh -i ~/.ssh/stefanhaselwimmer_rsa" out/ root@votewind.org:/var/www/test/
