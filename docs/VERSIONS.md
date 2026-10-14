# Versions and availability

For users choosing compatible inputs. [Home](../README.md) · [First scan](GETTING-STARTED.md) · [Runtime contract](../skills/agrimap-golden-lint-skills/references/RUNTIME.md).

| Identity | Current evidence |
| --- | --- |
| Specification | V002; immutable requirements input, not package version |
| Lint package | 0.1.1 source/runtime release in package.json; npm package remains private |
| Golden expected | agrimap-agent-skills 4.11.0 plus pinned selected reference digests |
| V002 reference commit | 3c314c7a8fdc7c35ca41b4b161cb43824ed893fb |
| Locally inspected source checkout | 55c526a05db323d9877010cd49a6471c00ab1d5f; separately recorded in source-lock.json |
| Parser | TypeScript 5.9.3 exact digest; syntax only |
| Report schema | 1, independent of package and Golden versions |
| Runner | Node 22+ declared; current verification on Node 26.7.0/Windows |
| Hosts | Node source runner; manual SKILL adoption proposed, no installed-host verification |

Same version text does not establish byte identity. Source checkout and installed source are explicit modes, never silent fallbacks. A source lock update is reviewed maintenance; sync does not change trust or installed packages. GitHub release v0.1.1 supplies an allowlisted runtime ZIP and SHA-256 checksum. It supplies no installer or verified host-plugin installation. GitHub's automatic source archives include maintainer files; the runtime ZIP excludes them and all agent state.
