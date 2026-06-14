import { useMutation } from "@tanstack/react-query";
import { uploadContract } from "../lib/api";

export function useUpload() {
  return useMutation({
    mutationFn: (file) => uploadContract(file),
  });
}
