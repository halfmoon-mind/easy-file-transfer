### Server Setting for aws linux

```sh
sudo yum install git nginx

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
nvm install 20

git clone https://github.com/halfmoon-mind/easy-file-transfer.git
cd easy-file-transfer/server
npm i
npm i -g forever

sudo mkdir /etc/nginx/sites-available
sudo vi /etc/nginx/sites-available/default
# when in vi, save doesn't work use the following command
# :w !sudo tee % > /dev/null

sudo nginx -t
sudo systemctl restart nginx

sudo yum install certbot python3-certbot-nginx
sudo certbot --nginx -d easyfile.site
sudo certbot install --cert-name easyfile.site


sudo mkdir /etc/nginx/sites-enabled
sudo vi /etc/nginx/sites-enabled/default


# 포트번호 80번이 사용되는 경우, 다음 명령어 실행
# netstat -anp | grep 80
# sudo fuser -k 80/tcp

forever start server/server.js
```

If you are not using ssl, you need to set up nginx.

save this inside of `/etc/nginx/sites-available/default`

```nginx
server {
    listen 80;
    server_name easyfile.site www.easyfile.site;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name easyfile.site www.easyfile.site;

    ssl_certificate /etc/letsencrypt/live/easyfile.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/easyfile.site/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

sudo vi /etc/nginx/sites-available/easyfile.conf

```nginx
server {
    listen 80;
    server_name easyfile.site www.easyfile.site;

    root /var/www/easyfile;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

```sh
sudo cp /etc/letsencrypt/live/easyfile.site/privkey.pem /home/ec2-user/easy-file-transfer
sudo cp /etc/letsencrypt/live/easyfile.site/fullchain.pem /home/ec2-user/easy-file-transfer

sudo chown ec2-user:ec2-user /home/ec2-user/easy-file-transfer/privkey.pem
sudo chown ec2-user:ec2-user /home/ec2-user/easy-file-transfer/fullchain.pem
```
