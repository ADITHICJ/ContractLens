import os
import uuid
import json
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# Import user's existing pipeline modules
from utils import flatten_tree
from retrieval import ContractRetriever
from legal_analyzer import analyze_nodes
from pageindexservice import generate_pageindex_tree
from chat_service import answer_contract_question

load_dotenv()

app = FastAPI(title="ContractLens Backend")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def find_existing_tree(new_pdf_path, upload_dir, current_doc_id):
    import hashlib
    try:
        sha256 = hashlib.sha256()
        with open(new_pdf_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256.update(chunk)
        new_hash = sha256.hexdigest()
        
        for root, dirs, files in os.walk(upload_dir):
            if current_doc_id in root:
                continue
            if "contract.pdf" in files and "pageindex_tree.json" in files:
                existing_pdf = os.path.join(root, "contract.pdf")
                existing_sha256 = hashlib.sha256()
                with open(existing_pdf, "rb") as f:
                    for chunk in iter(lambda: f.read(4096), b""):
                        existing_sha256.update(chunk)
                if existing_sha256.hexdigest() == new_hash:
                    existing_tree = os.path.join(root, "pageindex_tree.json")
                    print(f"[PAGEINDEX] Found existing pageindex_tree.json in {root} matching PDF hash.")
                    return existing_tree
    except Exception as e:
        print(f"[PAGEINDEX] Error checking for existing tree: {e}")
    return None

class ChatRequest(BaseModel):
    documentId: str
    question: str

@app.post("/upload-contract")
async def upload_contract(file: UploadFile = File(...)):
    """
    Step 1: Store uploaded PDF.
    Step 2: Check for existing pageindex tree locally, or generate it.
    Step 3: Run RAG pipeline and analyzer.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    document_id = str(uuid.uuid4())
    doc_dir = os.path.join(UPLOAD_DIR, document_id)
    os.makedirs(doc_dir, exist_ok=True)

    # Step 1: Save the original PDF
    pdf_path = os.path.join(doc_dir, "contract.pdf")
    try:
        with open(pdf_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save PDF on server: {str(e)}")

    # Step 2: Check for existing pageindex_tree.json
    tree_path = os.path.join(doc_dir, "pageindex_tree.json")
    found_existing = False
    
    # 2a. Look for matching PDF file in other directories
    existing_tree_path = find_existing_tree(pdf_path, UPLOAD_DIR, document_id)
    if existing_tree_path and os.path.exists(existing_tree_path):
        try:
            shutil.copy(existing_tree_path, tree_path)
            found_existing = True
            print("[PAGEINDEX] Reused existing pageindex_tree.json from matching contract.")
        except Exception as e:
            print(f"[PAGEINDEX] Failed to copy matching tree: {e}")
            
    # 2b. Fall back to mock template if USE_MOCK_PIPELINE is true
    if not found_existing and os.getenv("USE_MOCK_PIPELINE", "false").lower() == "true":
        template_tree = os.path.join(UPLOAD_DIR, "4a04b373-e5e8-4082-98cc-2a8c9a7609c2", "pageindex_tree.json")
        if os.path.exists(template_tree):
            try:
                shutil.copy(template_tree, tree_path)
                found_existing = True
                print("[PAGEINDEX] Reused template pageindex_tree.json in mock mode.")
            except Exception as e:
                print(f"[PAGEINDEX] Failed to copy template tree: {e}")
                
    # 2c. If still not found, generate it using PageIndex API
    if not found_existing:
        try:
            tree_data = generate_pageindex_tree(pdf_path)
            with open(tree_path, "w", encoding="utf-8") as f:
                json.dump(tree_data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"PageIndex tree generation failed: {str(e)}")
    else:
        # Load the copied tree structure
        try:
            with open(tree_path, "r", encoding="utf-8") as f:
                tree_data = json.load(f)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to load existing tree: {str(e)}")

    # Step 3: Run Gemini analyzer (ALWAYS active)
    try:
        # 1. Flatten the tree nodes
        flat_nodes = flatten_tree(tree_data)
        
        # 2. Build BM25 index and retrieve top risky nodes
        retriever = ContractRetriever(flat_nodes)
        retrieved_nodes = retriever.retrieve()

        # 3. Analyze retrieved nodes with Gemini
        analysis_result = analyze_nodes(retrieved_nodes, document_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis pipeline failed: {str(e)}")

    # Save analysis results to uploads/documentId/analysis.json
    analysis_path = os.path.join(doc_dir, "analysis.json")
    try:
        with open(analysis_path, "w", encoding="utf-8") as f:
            json.dump(analysis_result, f, indent=2, ensure_ascii=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save final analysis: {str(e)}")

    return {
        "documentId": document_id,
        "analysis": analysis_result
    }

@app.get("/analysis/{documentId}")
async def get_analysis(documentId: str):
    """
    Returns the generated analysis.json file for the given documentId.
    """
    analysis_path = os.path.join(UPLOAD_DIR, documentId, "analysis.json")
    if not os.path.exists(analysis_path):
        raise HTTPException(status_code=404, detail="Analysis not found for this document ID.")
    
    try:
        with open(analysis_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read analysis file: {str(e)}")

@app.get("/pdf/{documentId}")
async def get_pdf(documentId: str):
    """
    Returns the uploaded contract PDF.
    """
    pdf_path = os.path.join(UPLOAD_DIR, documentId, "contract.pdf")
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF not found for this document ID.")
    
    return FileResponse(pdf_path, media_type="application/pdf", filename="contract.pdf")

@app.get("/download-highlighted/{documentId}")
async def download_highlighted(documentId: str):
    """
    Generates a highlighted PDF using PyMuPDF and returns it for download.
    """
    doc_dir = os.path.join(UPLOAD_DIR, documentId)
    pdf_path = os.path.join(doc_dir, "contract.pdf")
    analysis_path = os.path.join(doc_dir, "analysis.json")
    output_path = os.path.join(doc_dir, "highlighted_contract.pdf")

    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="Original PDF not found.")
    
    if not os.path.exists(analysis_path):
        return FileResponse(pdf_path, media_type="application/pdf", filename="contract.pdf")

    if os.path.exists(output_path):
        return FileResponse(output_path, media_type="application/pdf", filename="highlighted_contract.pdf")

    try:
        import fitz
        doc = fitz.open(pdf_path)
        with open(analysis_path, "r", encoding="utf-8") as f:
            analysis = json.load(f)

        clauses = analysis.get("important_clauses", [])
        for c in clauses:
            level = c.get("risk_level", "MEDIUM").upper()
            if c.get("cross_clause_conflicts"):
                color = (0.39, 0.4, 0.94)
            elif level == "HIGH":
                color = (0.94, 0.27, 0.27)
            elif level == "LOW":
                color = (0.06, 0.73, 0.5)
            else:
                color = (0.96, 0.62, 0.04)

            quotes = []
            if c.get("highlighted_quotes"):
                for q in c["highlighted_quotes"]:
                    if q.get("quote"):
                        quotes.append({"quote": q["quote"], "page": q.get("page") or c.get("page")})
            elif c.get("section_title"):
                quotes.append({"quote": c["section_title"], "page": c.get("page")})

            for q in quotes:
                quote_text = q["quote"].strip()
                page_idx = q["page"] - 1
                if page_idx < 0 or page_idx >= len(doc):
                    continue

                page = doc[page_idx]
                rects = page.search_for(quote_text)

                if not rects:
                    sentences = [s.strip() for s in quote_text.split(".") if len(s.strip()) > 10]
                    if sentences:
                        for s in sentences:
                            s_rects = page.search_for(s)
                            for r in s_rects:
                                rects.append(r)

                if not rects:
                    words = quote_text.split()
                    chunk_size = 6
                    chunks = []
                    for i in range(0, len(words), chunk_size):
                        chunk = " ".join(words[i:i+chunk_size])
                        if len(chunk) > 15:
                            chunks.append(chunk)
                    if chunks:
                        for chunk in chunks:
                            c_rects = page.search_for(chunk)
                            for r in c_rects:
                                rects.append(r)

                for r in rects:
                    annot = page.add_highlight_annot(r)
                    annot.set_colors(stroke=color)
                    annot.update()

        doc.save(output_path)
        return FileResponse(output_path, media_type="application/pdf", filename="highlighted_contract.pdf")
    except Exception as e:
        print(f"Error highlighting PDF: {e}")
        return FileResponse(pdf_path, media_type="application/pdf", filename="contract.pdf")

@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Contract Q&A endpoint using the same tree, BM25 retrieval, and Gemini API.
    """
    tree_path = os.path.join(UPLOAD_DIR, request.documentId, "pageindex_tree.json")
    if not os.path.exists(tree_path):
        raise HTTPException(status_code=404, detail="Contract tree structure not found.")
    
    try:
        with open(tree_path, "r", encoding="utf-8") as f:
            tree_data = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load tree structure: {str(e)}")
    
    try:
        answer = answer_contract_question(request.question, tree_data, request.documentId)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat execution failed: {str(e)}")
