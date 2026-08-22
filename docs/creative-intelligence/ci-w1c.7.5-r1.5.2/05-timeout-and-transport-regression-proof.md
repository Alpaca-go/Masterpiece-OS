# Timeout and Transport Regression Proof

R1.5.1 contracts remain intact:

| Contract | Result |
|---|---:|
| TIMEOUT-01..06 | 6/6 PASS |
| RETRY-01..07 | 7/7 PASS |
| TAX-01..06 | 6/6 PASS |
| EVID-TR-01..04 | 4/4 PASS |
| Combined | 23/23 PASS |

TIMEOUT-06 was strengthened to require all three default-scope stages to finish `PASS`: synthesis, concept, and direction. The shared test reasoner now checks the more-specific Direction artifact marker before Concept because a Direction prompt legitimately embeds the accepted Concept Set.

No timeout value, retry bound, attempt classification, or semantic-repair rule changed in R1.5.2.
