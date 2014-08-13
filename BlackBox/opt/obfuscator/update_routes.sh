#!/bin/bash -e
SECRET=ab3847dcef228a
TIME_BUCKET=60

PATH=/etc/apache2/rewrite-maps/dynamic
NEW_ROUTES=$PATH/new_routes.txt
OLD_ROUTES=$PATH/old_routes.txt

# Roll routes
ROUTES="## Rolled routes:$(/bin/cat $NEW_ROUTES)"
echo "$ROUTES" > $OLD_ROUTES

# Generate new ROUTES
PUBLISHER_PATH=/var/www/vhosts/demo
BLACKBOX_PATH=/var/www/vhosts/blackbox
ACTUAL_ROUTES=()
shopt -s globstar
for file in $PUBLISHER_PATH/**
do
  if [ -f "$file" ]
  then
    route=${file/$PUBLISHER_PATH\//}
    ACTUAL_ROUTES+=("$route")
  fi
done
for file in $BLACKBOX_PATH/**
do
  if [ -f "$file" ]
  then
    route=${file/$BLACKBOX_PATH\//}
    ACTUAL_ROUTES+=("blackbox/$route")
  fi
done

ROUTES="# Routes\n"

for route in ${ACTUAL_ROUTES[*]}
do
  let DATE=$(/bin/date +%s)/$TIME_BUCKET
  ID="$DATE$route"
  HASH=$(echo -n $ID|/usr/bin/openssl sha1 -hmac $SECRET|/bin/sed -e 's/^.* //')
  ROUTES="$ROUTES\n/assets/$HASH $route"
done
echo -e $ROUTES > $NEW_ROUTES
