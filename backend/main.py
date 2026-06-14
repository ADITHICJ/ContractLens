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

class ChatRequest(BaseModel):
    documentId: str
    question: str

@app.post("/upload-contract")
async def upload_contract(file: UploadFile = File(...)):
    """
    Step 1: Store uploaded PDF.
    Step 2: Upload PDF to PageIndex.
    Step 3-5: Generate, Fetch, and Save PageIndex Tree.
    Step 6-8: Run RAG pipeline (flatten_tree, ContractRetriever, analyze_nodes) and return results.
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

    # Step 2-5: Generate and fetch PageIndex tree
    use_mock = os.getenv("USE_MOCK_PIPELINE", "false").lower() == "true"
    if use_mock:
        print("[MOCK MODE] Copying pre-generated PageIndex tree and Gemini analysis...")
        template_dir = os.path.join(UPLOAD_DIR, "4a04b373-e5e8-4082-98cc-2a8c9a7609c2")
        if not os.path.exists(template_dir):
            raise HTTPException(
                status_code=500,
                detail="Mock template directory '4a04b373-e5e8-4082-98cc-2a8c9a7609c2' not found in uploads."
            )
        try:
            shutil.copy(os.path.join(template_dir, "pageindex_tree.json"), os.path.join(doc_dir, "pageindex_tree.json"))
            shutil.copy(os.path.join(template_dir, "analysis.json"), os.path.join(doc_dir, "analysis.json"))
            with open(os.path.join(doc_dir, "analysis.json"), "r", encoding="utf-8") as f:
                analysis_result = json.load(f)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to copy mock template files: {str(e)}")
            
        return {
            "documentId": document_id,
            "analysis": analysis_result
        }

    try:
        tree_data = generate_pageindex_tree(pdf_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PageIndex tree generation failed: {str(e)}")

    tree_path = os.path.join(doc_dir, "pageindex_tree.json")
    try:
        with open(tree_path, "w", encoding="utf-8") as f:
            json.dump(tree_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save PageIndex tree: {str(e)}")

    # Step 6: Run existing pipeline
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
