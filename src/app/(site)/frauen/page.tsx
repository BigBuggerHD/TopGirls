import type { Metadata } from "next";
import { CategorySearch } from "@/components/profiles/category-search";

export const metadata: Metadata = { title: "Frauen", alternates: { canonical: "/frauen" } };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CategorySearch slug="frauen" basePath="/frauen" searchParams={await searchParams} />;
}
