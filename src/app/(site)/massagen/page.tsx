import type { Metadata } from "next";
import { CategorySearch } from "@/components/profiles/category-search";

export const metadata: Metadata = { title: "Massagen", alternates: { canonical: "/massagen" } };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CategorySearch slug="massagen" basePath="/massagen" searchParams={await searchParams} />;
}
