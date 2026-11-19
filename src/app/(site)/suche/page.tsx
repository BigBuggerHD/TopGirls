import type { Metadata } from "next";
import { CategorySearch } from "@/components/profiles/category-search";

export const metadata: Metadata = { title: "Suche" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CategorySearch basePath="/suche" searchParams={await searchParams} />;
}
