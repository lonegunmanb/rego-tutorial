#!/bin/bash
# ─────────────────────────────────────────────────────────
# setup-common.sh — shared setup functions for Killercoda scenarios
#
# This file is the SINGLE SOURCE OF TRUTH for common setup logic.
# It is copied into each scenario's assets/ directory by:
#   npm run sync-setup  (or automatically via prebuild)
#
# Usage in background.sh:
#   source /root/setup-common.sh
#   install_conftest
#   install_opa          # optional — standalone OPA binary
#   finish_setup
# ─────────────────────────────────────────────────────────

CONFTEST_VERSION="${CONFTEST_VERSION:-0.56.0}"
OPA_VERSION="${OPA_VERSION:-1.4.2}"

install_conftest() {
  apt-get update -qq && apt-get install -y -qq unzip curl > /dev/null 2>&1

  curl --connect-timeout 10 --max-time 120 -fsSL \
    "https://github.com/open-policy-agent/conftest/releases/download/v${CONFTEST_VERSION}/conftest_${CONFTEST_VERSION}_Linux_x86_64.tar.gz" \
    -o /tmp/conftest.tar.gz \
    && tar xzf /tmp/conftest.tar.gz -C /usr/local/bin/ conftest \
    && chmod +x /usr/local/bin/conftest \
    && rm -f /tmp/conftest.tar.gz

  conftest --version || echo "WARNING: conftest install failed"
}

install_opa() {
  curl --connect-timeout 10 --max-time 120 -fsSL \
    "https://github.com/open-policy-agent/opa/releases/download/v${OPA_VERSION}/opa_linux_amd64_static" \
    -o /usr/local/bin/opa \
    && chmod +x /usr/local/bin/opa

  opa version || echo "WARNING: opa install failed"
}

finish_setup() {
  touch /tmp/.setup-done
}
