#!/bin/zsh
set -eu
cd "${0:A:h}/.."
exec npx --yes deno@2.7.14 task manage
