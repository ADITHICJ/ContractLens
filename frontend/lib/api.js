import { API_BASE_URL } from "./constants";

export async function uploadContract(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/upload-contract`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to upload contract.");
  }

  return response.json();
}

export async function getAnalysis(documentId) {
  const response = await fetch(`${API_BASE_URL}/analysis/${documentId}`);
  if (!response.ok) {
    throw new Error("Failed to retrieve analysis.");
  }
  return response.json();
}

export function getPDFUrl(documentId) {
  return `${API_BASE_URL}/pdf/${documentId}`;
}

export async function chatContract(documentId, question) {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ documentId, question }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to get chat response.");
  }

  return response.json();
}


