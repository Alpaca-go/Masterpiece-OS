# Image-generation baseline

This fixture freezes the pre-Creative-Director image-generation inputs used for
the A/B checks in later phases. The existing prompt snapshots remain the source
of truth for the legacy (A) path; `golden-run.json` records the legacy reference
selection and expected single-anchor output contract without calling a provider.

The Creative Director (B) fixtures added in later phases must use the same
project facts and assets while changing only the compilation path.
