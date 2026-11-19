import type { Metadata } from "next";
import { CategorySearch } from "@/components/profiles/category-search";

export const metadata: Metadata = { title: "Clubs", alternates: { canonical: "/clubs" } };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CategorySearch slug="clubs" basePath="/clubs" searchParams={await searchParams} />;
}
