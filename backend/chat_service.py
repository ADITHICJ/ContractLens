import json
import os
from rank_bm25 import BM25Okapi
from utils import tokenize, flatten_tree
from legal_analyzer import safe_generate

LEGAL_RISK_TERMS = [
    "liability", "termination", "penalty", "arbitration", "indemnity",
    "dispute", "fine", "damages", "breach", "default", "jurisdiction",
    "confidentiality", "compliance", "obligation", "exclusive", "binding",
    "suspension", "force majeure", "payment", "delay", "interest",
    "renewal", "warranty", "limitation", "claims", "responsibility",
    "compensation", "deduction", "security deposit", "liquidated damages",
    "immediate termination", "sole arbitrator", "final decision"
]

def answer_contract_question(question: str, tree_data, contract_id: str) -> str:
    """
    Retrieves the most relevant nodes using the same BM25 retrieval pipeline and answers the question via Gemini.
    """
    # 1. Flatten tree to get all nodes
    all_nodes = flatten_tree(tree_data)
    if not all_nodes:
        return "The contract has no content to answer questions from."

    # 2. Tokenize corpus for BM25
    corpus = []
    for node in all_nodes:
        text = node.get("title", "") + " " + node.get("text", "")
        corpus.append(tokenize(text))

    bm25 = BM25Okapi(corpus)

    # 3. Retrieve relevant nodes using the user's question
    tokenized_query = tokenize(question)
    scores = bm25.get_scores(tokenized_query)

    ranked = []
    for idx, score in enumerate(scores):
        node = all_nodes[idx]
        text = (node.get("title", "") + " " + node.get("text", "")).lower()

        # Apply same legal boosting
        boost = 0
        for term in LEGAL_RISK_TERMS:
            if term in text:
                boost += 3
        
        ranked.append((score + boost, node))

    ranked.sort(reverse=True, key=lambda x: x[0])

    # Take top 5 nodes for Q&A context to avoid prompt overflow and keep it focused
    top_nodes = [node for _, node in ranked[:5]]

    # 4. Construct context
    context_sections = []
    for node in top_nodes:
        context_sections.append(
            f"SECTION: {node.get('title')}\nPAGE: {node.get('page_index')}\nCONTENT:\n{node.get('text', '')}"
        )
    
    full_context = "\n\n====================\n\n".join(context_sections)

    # 5. Call Gemini to answer the question
    prompt = f"""
You are an expert legal assistant for the ContractLens platform.
Answer the user's question using only the provided contract context sections. If the answer cannot be found in the context, state that you cannot find the answer in the document, but still try to be as helpful as possible based on the text.

Question: {question}

Context sections from the contract:
====================
{full_context}
====================

Provide a detailed, professional, and clear answer.
"""
    answer = safe_generate(prompt)
    if answer == "ERROR":
        return "An error occurred while communicating with the AI model. Please try again."
    
    return answer
