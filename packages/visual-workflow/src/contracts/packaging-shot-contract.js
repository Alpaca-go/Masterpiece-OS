const PACKAGING_SHOT_CONTRACT_VERSION = "1.0.0";
const PACKAGING_SHOT_CONTRACTS = Object.freeze([
  "PKG-HERO-SINGLE",
  "PKG-SERIES-GROUP",
  "PKG-GIFT-OPEN"
]);
const PACKAGING_SHOT_CONTRACT_LABELS = Object.freeze({
  "PKG-HERO-SINGLE": "Hero Render (Single SKU)",
  "PKG-SERIES-GROUP": "Series Group Render (multi-SKU uniform display)",
  "PKG-GIFT-OPEN": "Gift Box Open State (interior structure)"
});
function isPackagingShotContract(value) {
  return typeof value === "string" && PACKAGING_SHOT_CONTRACTS.includes(
    /** @type {PackagingShotContract} */
    value
  );
}
const PACKAGING_FAILURE_CODES_VERSION = "1.0.0";
const PACKAGING_FAILURE_CODES = Object.freeze([
  "PKG-F01",
  "PKG-F02",
  "PKG-F03",
  "PKG-F04",
  "PKG-F05",
  "PKG-F06",
  "PKG-F07",
  "PKG-F08",
  "PKG-F09",
  "PKG-F10",
  "PKG-F11",
  "PKG-F12"
]);
const PACKAGING_AUTO_FAIL_CODES = Object.freeze([
  "PKG-F01",
  "PKG-F02",
  "PKG-F11"
]);
function isPackagingFailureCode(value) {
  return typeof value === "string" && PACKAGING_FAILURE_CODES.includes(
    /** @type {PackagingFailureCode} */
    value
  );
}
export {
  PACKAGING_AUTO_FAIL_CODES,
  PACKAGING_FAILURE_CODES,
  PACKAGING_FAILURE_CODES_VERSION,
  PACKAGING_SHOT_CONTRACTS,
  PACKAGING_SHOT_CONTRACT_LABELS,
  PACKAGING_SHOT_CONTRACT_VERSION,
  isPackagingFailureCode,
  isPackagingShotContract
};
