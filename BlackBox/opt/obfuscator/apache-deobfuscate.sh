#!/bin/bash
SECRET=ab3847dcef228a
PERIOD=600

while read line; do
  let time=$(date +%s)/$PERIOD
  plaintext=$(echo "$line" | openssl enc -d -aes-256-cbc -a -A -k "${time}${SECRET}" 2>/dev/null)
  if [ $? -ne 0 ]
  then
    # Try again with last period's secret
    let time=($(date +%s)/$PERIOD)-1
    plaintext=$(echo "$line" | openssl enc -d -aes-256-cbc -a -A -k "${time}${SECRET}" 2>/dev/null)
    if [ $? -ne 0 ]
    then
      plaintext="404"
    fi
  fi
  echo $plaintext
done
