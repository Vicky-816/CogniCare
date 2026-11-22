import { setPatientMode } from "@/lib/profiles/pin";
import { getProfileStore } from "@/lib/profiles/store";

/**
 * Switches this device into patient mode for one person. If a family PIN
 * exists, the family area locks until it is entered.
 */
export async function startPatientMode(profileId: string, go: (href: string) => void) {
  const pin = await getProfileStore().getPin();
  setPatientMode(Boolean(pin));
  go(`/play/${profileId}`);
}
