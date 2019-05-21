set -e

if [ ! -d /var/lib/mysql/mysql ]; then
    echo 'start init mysql.........'
    # mysql_install_db &> /dev/null
    mysql_install_db --datadir=/var/lib/mysql
    mkdir -p /run/mysqld
    tfile=`mktemp`
    echo "USE mysql;" >> $tfile
    echo "FLUSH PRIVILEGES;" >> $tfile
    echo "CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE:-spug}\` CHARACTER SET utf8 COLLATE utf8_general_ci;" >> $tfile
    echo "GRANT ALL ON \`${MYSQL_DATABASE:-spug}\`.* to '${MYSQL_USER:-spuguser}'@'localhost' IDENTIFIED BY '${MYSQL_PASSWORD:-spugpwd}';" >> $tfile
    echo "FLUSH PRIVILEGES;" >> $tfile
    exec /usr/bin/mysqld --user=root --bootstrap < $tfile &> /dev/null
    rm -f $tfile
fi 
