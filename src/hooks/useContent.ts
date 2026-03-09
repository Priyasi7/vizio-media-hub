import { useQuery } from "@tanstack/react-query";
import { fetchCategory } from "@/services/api";
import type { Category } from "@/types/content";

export function useContent(category: Category) {
  return useQuery({
    queryKey: ["content", category],
    queryFn: () => fetchCategory(category),
    staleTime: 5 * 60 * 1000,
  });
}
