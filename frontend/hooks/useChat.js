import { useMutation } from "@tanstack/react-query";
import { chatContract } from "../lib/api";

export function useChat() {
  return useMutation({
    mutationFn: ({ documentId, question }) => chatContract(documentId, question),
  });
}
