import type { Metadata } from "next";
import { CategorySearch } from "@/components/profiles/category-search";

export const metadata: Metadata = { title: "Online-Inserate", alternates: { canonical: "/online-inserate" } };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CategorySearch slug="online-inserate" basePath="/online-inserate" searchParams={await searchParams} />;
}
