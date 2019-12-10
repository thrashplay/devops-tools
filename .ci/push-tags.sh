#!/usr/bin/env sh

set -e
set -x

if [ -z "$DRONE_COMMIT_SHA" ]; then
  echo "Refusing to force push, because no original commit SHA was provided."
  exit 1
fi

# for debugging sake, just log what's changed
git status

# Force push the tags and amended message.
git push --no-verify --force-with-lease=master:${DRONE_COMMIT_SHA} --set-upstream origin master
# only push tags if actual commit worked, ie lease wasn't expired
git push --tags
