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
from legal_analyzer import analyze_nodes, analyze_gaps, extract_metadata, find_placeholders
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
        analysis_result["total_sections"] = len(flat_nodes)

        # 4. Perform gap analysis, metadata extraction, and placeholders check
        try:
            gap_result = analyze_gaps(flat_nodes)
            analysis_result["gap_analysis"] = gap_result.get("missing_clauses", [])
        except Exception as e:
            print(f"Gap analysis failed: {e}")
            analysis_result["gap_analysis"] = []

        try:
            metadata_result = extract_metadata(flat_nodes)
            analysis_result["metadata"] = metadata_result
        except Exception as e:
            print(f"Metadata extraction failed: {e}")
            analysis_result["metadata"] = {
                "effective_date": "Not Specified",
                "duration": "Not Specified",
                "first_party": "Not Specified",
                "second_party": "Not Specified",
                "jurisdiction": "Not Specified"
            }

        try:
            placeholders_result = find_placeholders(pdf_path)
            analysis_result["placeholders"] = placeholders_result
        except Exception as e:
            print(f"Placeholders extraction failed: {e}")
            analysis_result["placeholders"] = []

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
@app.get("/download-summary-pdf/{documentId}")
async def download_summary_pdf(documentId: str):
    """
    Generates a summarized PDF report containing metadata, risks, gaps, and placeholders, and returns it.
    """
    doc_dir = os.path.join(UPLOAD_DIR, documentId)
    pdf_path = os.path.join(doc_dir, "contract.pdf")
    analysis_path = os.path.join(doc_dir, "analysis.json")
    output_path = os.path.join(doc_dir, "summary_report.pdf")

    if not os.path.exists(analysis_path):
        raise HTTPException(status_code=404, detail="Analysis results not found. Please analyze the contract first.")

    try:
        import fitz
        from datetime import datetime
        
        # Load analysis results
        with open(analysis_path, "r", encoding="utf-8") as f:
            analysis = json.load(f)

        doc = fitz.open()
        margin = 54
        width = 612
        height = 792 # US Letter dimensions
        
        page = doc.new_page(width=width, height=height)
        y = margin
        
        def check_page(needed_height):
            nonlocal page, y
            if y + needed_height > (height - margin):
                page = doc.new_page(width=width, height=height)
                y = margin
                # Draw header
                rect = fitz.Rect(margin, y, width - margin, y + 15)
                page.insert_textbox(rect, "ContractLens Intelligence Summary", fontsize=8, fontname="Helvetica", color=(0.5, 0.5, 0.5))
                y += 20
                page.draw_line(fitz.Point(margin, y), fitz.Point(width - margin, y), color=(0.8, 0.8, 0.8), width=0.5)
                y += 15

        def write_paragraph(text, x_indent=0, font_size=9, font_name="Helvetica", color=(0.2, 0.2, 0.2), spacing=12, is_bold=False, is_oblique=False):
            nonlocal page, y
            max_width = width - margin - (margin + x_indent)
            chars_per_line = int(max_width / (font_size * 0.48))
            
            paragraphs = str(text).split("\n")
            lines = []
            for para in paragraphs:
                words = para.split(" ")
                current_line = []
                for word in words:
                    test_line = " ".join(current_line + [word])
                    if len(test_line) > chars_per_line and current_line:
                        lines.append(" ".join(current_line))
                        current_line = [word]
                    else:
                        current_line.append(word)
                if current_line:
                    lines.append(" ".join(current_line))
                    
            fname = font_name
            if is_bold and is_oblique:
                fname = font_name + "-BoldOblique"
            elif is_bold:
                fname = font_name + "-Bold"
            elif is_oblique:
                fname = font_name + "-Oblique"
                
            for line in lines:
                if y + spacing > (height - margin):
                    page = doc.new_page(width=width, height=height)
                    y = margin
                    rect = fitz.Rect(margin, y, width - margin, y + 15)
                    page.insert_textbox(rect, "ContractLens Intelligence Summary", fontsize=8, fontname="Helvetica", color=(0.5, 0.5, 0.5))
                    y += 20
                    page.draw_line(fitz.Point(margin, y), fitz.Point(width - margin, y), color=(0.8, 0.8, 0.8), width=0.5)
                    y += 15
                
                page.insert_text(fitz.Point(margin + x_indent, y + font_size), line, fontsize=font_size, fontname=fname, color=color)
                y += spacing

        # Title
        rect = fitz.Rect(margin, y, width - margin, y + 30)
        page.insert_textbox(rect, "CONTRACTLENS ANALYSIS SUMMARY REPORT", fontsize=16, fontname="Helvetica-Bold", align=1, color=(0.1, 0.2, 0.4))
        y += 40
        
        # Doc ID & Date
        rect = fitz.Rect(margin, y, width - margin, y + 25)
        first_party = analysis.get("metadata", {}).get("first_party", "Contract")[:50]
        date_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        page.insert_textbox(rect, f"Report Generated: {date_str}   |   Contract Profile: {first_party}", fontsize=9, fontname="Helvetica-Bold", align=1, color=(0.4, 0.4, 0.4))
        y += 20
        
        page.draw_line(fitz.Point(margin, y), fitz.Point(width - margin, y), color=(0.1, 0.2, 0.4), width=1.5)
        y += 25
        
        # --- Metadata Section ---
        check_page(120)
        write_paragraph("1. CONTRACT PARAMETERS PROFILE", font_size=12, font_name="Helvetica", is_bold=True, color=(0.1, 0.2, 0.4))
        y += 5
        
        metadata = analysis.get("metadata", {})
        metadata_fields = [
            ("Effective Date", metadata.get("effective_date", "Not Specified")),
            ("Duration", metadata.get("duration", "Not Specified")),
            ("First Party (Client)", metadata.get("first_party", "Not Specified")),
            ("Second Party (Contractor)", metadata.get("second_party", "Not Specified")),
            ("Jurisdiction / Law", metadata.get("jurisdiction", "Not Specified")),
        ]
        
        for label, val in metadata_fields:
            check_page(20)
            page.insert_text(fitz.Point(margin + 10, y + 10), f"{label}:", fontsize=10, fontname="Helvetica-Bold", color=(0.3, 0.3, 0.3))
            page.insert_text(fitz.Point(margin + 190, y + 10), str(val), fontsize=10, fontname="Helvetica", color=(0.1, 0.1, 0.1))
            y += 18
            
        y += 25
        
        # --- Risk Redlines Section ---
        check_page(40)
        write_paragraph("2. DETECTED RISK & NEGOTIATION REDLINES", font_size=12, font_name="Helvetica", is_bold=True, color=(0.1, 0.2, 0.4))
        y += 5
        
        clauses = analysis.get("important_clauses", [])
        if not clauses:
            check_page(25)
            write_paragraph("No critical risks detected in the analyzed clauses.", x_indent=10, font_name="Helvetica-Oblique", color=(0.4, 0.4, 0.4))
        else:
            def risk_sort_key(c):
                lvl = c.get("risk_level", "MEDIUM").upper()
                if lvl == "CRITICAL": return 0
                if lvl == "HIGH": return 1
                if lvl == "MEDIUM": return 2
                return 3
                
            sorted_clauses = sorted(clauses, key=risk_sort_key)
            for idx, clause in enumerate(sorted_clauses):
                check_page(40)
                title = clause.get("section_title", "Unspecified Section")
                page_num = clause.get("page", 0)
                level = clause.get("risk_level", "LOW")
                type_val = clause.get("risk_type", "General")
                crit = clause.get("criticality_score", 5)
                conf = clause.get("confidence", 80)
                legal = clause.get("legal_reason", "")
                simple = clause.get("simple_reason", "")
                remedy = clause.get("recommendation", "")
                
                # Format confidence value
                if isinstance(conf, float) and conf <= 1.0:
                    conf_str = f"{conf * 100:.1f}%"
                else:
                    conf_str = f"{conf}%"
                
                y += 5
                write_paragraph(f"[{idx+1}] {title} (Page {page_num}) - {level} RISK", x_indent=10, font_size=10, font_name="Helvetica", is_bold=True, color=(0.8, 0.2, 0.2) if level in ["HIGH", "CRITICAL"] else (0.7, 0.4, 0.0))
                write_paragraph(f"Risk Type: {type_val}   |   Criticality: {crit}/10   |   Confidence: {conf_str}", x_indent=20, font_size=9, font_name="Helvetica", is_bold=True, color=(0.4, 0.4, 0.4))
                write_paragraph(f"Legal Rationale: {legal}", x_indent=20, font_size=9, color=(0.2, 0.2, 0.2))
                write_paragraph(f"Simple Explanation: {simple}", x_indent=20, font_size=9, color=(0.3, 0.3, 0.3))
                write_paragraph(f"Recommended Action: {remedy}", x_indent=20, font_size=9, font_name="Helvetica-Oblique", color=(0.1, 0.4, 0.2))
                y += 10
                
        y += 15
        
        # --- Gap Audit Section ---
        check_page(40)
        write_paragraph("3. AUTOMATED GAP AUDIT (MISSING TERMS)", font_size=12, font_name="Helvetica", is_bold=True, color=(0.1, 0.2, 0.4))
        y += 5
        
        gaps = analysis.get("gap_analysis", [])
        if not gaps:
            check_page(25)
            write_paragraph("No critical boilerplate gaps or missing terms detected in this contract.", x_indent=10, font_name="Helvetica-Oblique", color=(0.4, 0.4, 0.4))
        else:
            for idx, gap in enumerate(gaps):
                check_page(40)
                title = gap.get("title", "Missing Clause")
                severity = gap.get("impact_severity", "MEDIUM")
                reason = gap.get("simple_explanation", gap.get("reason_missing", ""))
                draft = gap.get("draft_text", "")
                
                write_paragraph(f"[{idx+1}] {title} - Severity: {severity}", x_indent=10, font_size=10, font_name="Helvetica", is_bold=True, color=(0.8, 0.2, 0.2) if severity == "HIGH" else (0.7, 0.4, 0.0))
                write_paragraph(f"Plain English Translation: {reason}", x_indent=20, font_size=9, color=(0.2, 0.2, 0.2))
                if draft:
                    write_paragraph(f"Suggested Draft Clause:", x_indent=20, font_size=9, font_name="Helvetica-Bold", color=(0.3, 0.3, 0.3))
                    write_paragraph(draft, x_indent=20, font_size=9, font_name="Courier", color=(0.1, 0.1, 0.1))
                y += 10
                
        y += 15
        
        # --- Placeholders Section ---
        placeholders = analysis.get("placeholders", [])
        if placeholders:
            check_page(40)
            write_paragraph("4. INCOMPLETE PLACEHOLDERS LOCATOR", font_size=12, font_name="Helvetica", is_bold=True, color=(0.1, 0.2, 0.4))
            y += 5
            
            for idx, p in enumerate(placeholders):
                check_page(40)
                matched_text = p.get("placeholder", "_______")
                page_num = p.get("page", 1)
                context = p.get("context", "")
                
                write_paragraph(f"[{idx+1}] Placeholder: \"{matched_text}\" (Page {page_num})", x_indent=10, font_size=10, font_name="Helvetica", is_bold=True, color=(0.1, 0.2, 0.4))
                write_paragraph(f"Context: {context}", x_indent=20, font_size=9, color=(0.2, 0.2, 0.2))
                y += 10

        doc.save(output_path)
        doc.close()
        
        return FileResponse(output_path, media_type="application/pdf", filename="summary_report.pdf")
    except Exception as e:
        print(f"Error generating summary PDF: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate summary PDF: {str(e)}")


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
