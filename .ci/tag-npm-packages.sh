#!/usr/bin/env sh

set -e
set -x

export FROM_TAG="${1}"
export TO_TAG="${2}"
#npx lerna exec --stream --no-bail --concurrency 1 -- 'PKG_VERSION=$(npm v . dist-tags.${FROM_TAG}); [ -n "$PKG_VERSION" ] && ( npm dist-tag add ${LERNA_PACKAGE_NAME}@${PKG_VERSION} ${TO_TAG} ) || exit 0'

echo "WARNING: Multiple release channels are not currently supported"
