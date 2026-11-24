import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SetupGuide({
  profileId,
  step,
  photoCount = 0,
}: {
  profileId: string;
  step: "photos" | "schedule";
  photoCount?: number;
}) {
  return (
    <section aria-label="Set up patient mode" className="space-y-4 rounded-3xl bg-accent-soft p-6">
      <h2 className="text-2xl font-bold">Set up patient mode</h2>
      <ol className="flex flex-wrap gap-x-6 gap-y-2 text-lg">
        <li>1. Person added</li>
        <li aria-current={step === "photos" ? "step" : undefined} className={step === "photos" ? "font-bold" : ""}>
          2. Familiar photos
        </li>
        <li aria-current={step === "schedule" ? "step" : undefined} className={step === "schedule" ? "font-bold" : ""}>
          3. First reminder
        </li>
        <li>4. Start patient mode</li>
      </ol>
      {step === "photos" && (
        <>
          <p className="text-lg">
            Add 3–5 familiar photos with names. Three unlock Who is this? and four unlock Memory Match. {photoCount}{" "}
            photos added.
          </p>
          <Button asChild variant={photoCount >= 3 ? "default" : "outline"}>
            <Link href={`/family/profiles/${profileId}/schedule`}>
              {photoCount >= 3 ? "Continue to first reminder" : "Skip photos for now"}
            </Link>
          </Button>
        </>
      )}
      {step === "schedule" && (
        <p className="text-lg">Add a familiar event such as lunch or a family visit below. You can change it later.</p>
      )}
    </section>
  );
}
