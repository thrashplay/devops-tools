# CI Helpers
This directory contains scripts used by the continuous integration process to
perform various tasks that were more difficult to maintain directly in the CI 
configuration.

Rather than allow Lerna to push new commits with tags and version bumps, this 
script facilitates a process where the CI system amends the original commit with 
build/release metadata, and then pushes it using `--force-with-lease`. This 
results in a cleaner git history, and tags being actually associated with the
commits that generated them (instead of a separate, 'publish' commit).

There are some tradeoffs to this process, however:
1. the CI system is modifying commits made by 'real' people
1. because it uses an explicit `--force-with-lease`, these pushes will fail if
any other changes have happened on the branch

See the 
[Thrashplay CI/CD Workflow documentation (link TBD)](https://LINK_NEEDED) for a
more detailed description of this process and the rationale for it.   

## amend-commit
This script runs before `lerna version`, and pre-amends the last commit. It adds
some build metadata and a \[skip ci\] tag. This last part is important, 
otherwise -- when lerna pushes amended commits -- CI would retrigger in an
infinite loop.

We amend the commit _before_ calling Lerna in order to ensure that the Lerna 
tags are applied to the right commit.
 
## push-tags
