#!/usr/bin/env sh

set -e
set -x

# add a some build metadata and a [skip ci] message to prevent retriggering this build
git config trailer.separators ":#"
git config trailer.Build.key "Build #"
AMENDED_COMMIT_MESSAGE=`git log --format=%B -n1 | git interpret-trailers --trailer Build="${DRONE_BUILD_NUMBER}" --trailer Build-Meta="[skip ci]"`
git commit --amend -m "${AMENDED_COMMIT_MESSAGE}"
