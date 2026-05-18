"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Character creation is temporarily disabled. This page redirects to home.
export default function CreateCharacterPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return null;
}
