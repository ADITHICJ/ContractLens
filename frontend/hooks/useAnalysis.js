import { useQuery } from "@tanstack/react-query";
import { getAnalysis } from "../lib/api";

export function useAnalysis(documentId) {
  return useQuery({
    queryKey: ["analysis", documentId],
    queryFn: () => getAnalysis(documentId),
    enabled: !!documentId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}
