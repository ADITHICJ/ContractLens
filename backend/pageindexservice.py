import os
import time
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

PAGEINDEX_API_KEY = os.getenv("PAGEINDEX_API_KEY")
PAGEINDEX_URL = "https://api.pageindex.ai/doc/"

def generate_pageindex_tree(pdf_path: str):
    """
    Uploads a PDF to PageIndex, generates the tree, and retrieves the tree data.
    """
    if not PAGEINDEX_API_KEY:
        raise ValueError("PAGEINDEX_API_KEY is not configured in the environment.")

    headers = {
        "api_key": PAGEINDEX_API_KEY
    }

    # Step 1: Upload PDF
    print(f"Uploading {pdf_path} to PageIndex...")
    with open(pdf_path, "rb") as f:
        files = {
            "file": (os.path.basename(pdf_path), f, "application/pdf")
        }
        response = requests.post(PAGEINDEX_URL, headers=headers, files=files)
    
    if response.status_code != 200:
        raise Exception(f"Failed to upload to PageIndex. Status: {response.status_code}, Detail: {response.text}")

    result = response.json()
    doc_id = result.get("doc_id")
    if not doc_id:
        raise Exception(f"No doc_id returned from PageIndex. Response: {result}")
    
    print(f"Uploaded successfully. Document ID: {doc_id}")

    # Step 2: Poll / Get Tree Structure
    tree_url = f"https://api.pageindex.ai/doc/{doc_id}/?type=tree"
    max_attempts = 30
    delay = 2

    for attempt in range(max_attempts):
        print(f"Polling tree status for doc_id {doc_id} (Attempt {attempt + 1}/{max_attempts})...")
        tree_response = requests.get(tree_url, headers=headers)
        
        if tree_response.status_code == 200:
            tree_data = tree_response.json()
            # The structure returned can be a list or dict. Check if status is completed or check for tree data.
            # PageIndex tree returns details. Let's see if status is completed, or if we have nodes.
            # If status is present, verify it.
            status = tree_data.get("status")
            if status == "completed":
                print("PageIndex processing completed!")
                # The actual tree might be in "result" or "tree" or top-level. Let's return the full tree_data or "result" if it exists.
                return tree_data.get("result", tree_data)
            elif status == "failed":
                raise Exception(f"PageIndex processing failed for document {doc_id}")
            elif not status:
                # If there is no status, but it successfully returned the tree structure directly
                print("Received tree structure directly.")
                return tree_data
        else:
            print(f"Warning: tree status check failed with status {tree_response.status_code}")

        time.sleep(delay)

    raise TimeoutError(f"Timed out waiting for PageIndex tree generation for doc_id {doc_id}")
