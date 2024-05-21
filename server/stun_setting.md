```sh
sudo yum -y install make gcc gcc-c++ openssl-devel libevent libevent-devel wgetmkdir /root/turn
cd /root/turn
wget https://coturn.net/turnserver/v4.5.2/turnserver-4.5.2.tar.gz
./configure --prefix=/usr/local/turnserver
vim ~/.bashrc

export turnserver_home=/usr/local/turnserver
export PATH=$PATH:$turnserver_home/bin

vim /etc/turnserver.conf
```

open file coturn

```
/etc/turnserver.conf
```

```stun
listening-port=3478
fingerprint
realm=easyfile.site
server-name=stun.easyfile.site
```

```sh
sudo systemctl start coturn
sudo ufw allow 3478/udp
sudo ufw allow 3478/tcp
```
