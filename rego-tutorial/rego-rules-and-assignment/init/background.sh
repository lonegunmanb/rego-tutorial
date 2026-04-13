#!/bin/bash
exec > /tmp/background.log 2>&1
set -x

source /root/setup-common.sh

# Seed workspace files (fallback if assets copy fails)
mkdir -p /root/workspace/policy
cd /root/workspace

install_conftest
finish_setup
