export const DEMO_PROFILE_ID = "cognicare-sample-meera";
export function isDemoMode() {
  return typeof document !== "undefined" && document.cookie.split("; ").includes("cognicare-demo=1");
}
