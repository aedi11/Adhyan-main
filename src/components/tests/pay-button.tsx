"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PayButton({ amount }: { amount: number }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <><Loader2 className="h-4 w-4 animate-spin" /> Processing payment…</>
      ) : (
        <><Lock className="h-4 w-4" /> Pay ₹{amount}</>
      )}
    </Button>
  );
}
