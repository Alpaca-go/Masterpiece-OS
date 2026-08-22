# Replacement Source Boundary Audit

| Boundary | Result |
|---|---:|
| Selected sources | 1 |
| Selected source reads | 1 |
| Parent directory scans | 0 |
| Sibling source reads | 0 |
| Legacy PNG reads | 0 |
| Unrelated source reads | 0 |
| Provider/model calls | 0 |

One binary read populated an in-memory buffer. Hashing and local OOXML extraction both used that buffer. No local absolute path is persisted in tracked artifacts.
