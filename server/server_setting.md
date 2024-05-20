### Server Setting for aws linux

```sh
sudo yum install git nginx

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
nvm install 20

git clone https://github.com/halfmoon-mind/easy-file-transfer.git
cd easy-file-transfer
npm i

sudo vi /etc/nginx/sites-available/default
# when in vi, save doesn't work use the following command
# :w !sudo tee % > /dev/null

sudo yum install certbot python3-certbot-nginx
sudo certbot --nginx -d your_domain.com

npm i -g forever
forever start server/server.js
```

If you are not using ssl, you need to set up nginx.

save this inside of `/etc/nginx/sites-available/default`
```nginx

server {
listen 80;
server_name your_domain.com;

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
