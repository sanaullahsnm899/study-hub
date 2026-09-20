"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep the detail on the server logs, never on the screen.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="t-h1">Something went wrong</h1>
      <p className="t-caption mt-2 max-w-sm text-balance">
        We couldn&rsquo;t load this page. It is usually temporary — try again in a moment.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Go home
        </ButtonLink>
      </div>
      {error.digest && <p className="t-meta mt-6">Reference: {error.digest}</p>}
    </div>
  );
}
