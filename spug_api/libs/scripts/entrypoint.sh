#!/usr/bin/env bash
#
# usage: entrypoint.sh timeout command_by_base64 command_args
# timeout: command execute timeout
# command_by_base64: command encode by base64
# command_args: position arguments for command

set -e

trap "[ -z $1 ] && sleep 777d" EXIT

if [ -z $1 ]; then
    bash -c "$(echo ${__DEPLOY_START} | base64 -d)" && echo v_start exited || echo v_start exited, exit code $?

elif [ $1 == 'kill' ]; then
    # $1  string for 'kill'
    # $2  exec token

    if [ -f /tmp/$2 ]; then
        main_pid=$(head -1 /tmp/$2 | cut -c 2-)
        pkill -9 -P ${main_pid} || echo -n
        rm -f /tmp/$2
    fi
elif [ $1 == 'wait' ]; then
    # $1  string for 'wait'
    # $2  timeout seconds
    # $3  exec token
    # $4  main process pid

    for ((COUNTER=0; COUNTER < $2; ++COUNTER)); do
        #if ! ps -p $4 &> /dev/null; then
		if ! ps |awk '{print $1}'|grep -E "^$4$" &> /dev/null; then
            break
        fi
        sleep 1
    done
    rm -f /tmp/$3
    pkill -9 -P $4
else
    # $1  timeout seconds
    # $2  exec token
    # $3  exec content for base64 encode

    temp_file=/tmp/$2
    nohup /entrypoint.sh wait $1 $2 $$ &
    echo "#$$" > ${temp_file}
    echo $3 | base64 -d >> ${temp_file}
    shift
    shift
    shift
    source ${temp_file}
fi