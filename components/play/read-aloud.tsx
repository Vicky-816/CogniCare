"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/profiles/types";
import { speak } from "@/lib/schedule/speech";

export function ReadAloud({ text, language, label }: { text: string; language: Language; label: string }) {
  const [notice, setNotice] = useState("");
  return (
    <div>
      <Button
        size="lg"
        variant="secondary"
        className="min-h-14 text-xl"
        aria-label={label}
        onClick={async () => {
          setNotice("");
          if (!(await speak(text, language))) setNotice("Audio is unavailable. You can read the message here.");
        }}
      >
        <Volume2 aria-hidden /> Read aloud
      </Button>
      <p role="status" className="text-lg">
        {notice}
      </p>
    </div>
  );
}
