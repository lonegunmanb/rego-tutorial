#!/bin/bash
exec > /tmp/background.log 2>&1
set -x

source /root/setup-common.sh

mkdir -p /root/workspace/policy
cd /root/workspace

install_opa
finish_setup
