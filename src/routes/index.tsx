import { createFileRoute } from "@tanstack/react-router";
import { LatenteApp } from "@/components/latente/LatenteApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <LatenteApp />;
}
