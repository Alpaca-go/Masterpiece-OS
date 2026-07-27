# Deliverable mismatch baseline

This fixture freezes the V2 failure mode: a user asks for an interior scene,
but `visual_extension` still compiles a generic visual-extension task and sends
VI material references. V17 must replace this behavior with an explicit
`interior_scene` deliverable plan.
