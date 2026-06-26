import os
import re
import json
import time
import random

from google import genai

from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# ============================================================
# GEMINI CLIENT
# ============================================================

client = genai.Client(
    api_key=GEMINI_API_KEY
)

MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-pro"
]

# ============================================================
# SAFE GENERATE
# ============================================================

def safe_generate(
    prompt,
    retries=3
):

    for model in MODELS:

        for attempt in range(retries):

            try:

                response = (
                    client.models.generate_content(
                        model=model,
                        contents=prompt
                    )
                )

                return response.text

            except Exception as e:

                print(
                    f"⚠️ {model} failed "
                    f"(Attempt {attempt + 1})"
                )

                print(str(e))

                time.sleep(
                    random.randint(3, 8)
                )

    return "ERROR"

# ============================================================
# SAVE ANALYSIS
# ============================================================

def save_analysis(
    contract_id,
    result
):

    os.makedirs(
        "outputs",
        exist_ok=True
    )

    output_path = (
        f"outputs/{contract_id}_analysis.json"
    )

    with open(
        output_path,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            result,
            f,
            indent=2,
            ensure_ascii=False
        )

    print(
        f"✅ Analysis saved: {output_path}"
    )

    return output_path

# ============================================================
# PARSE GEMINI JSON SAFELY
# ============================================================

def extract_json(text):

    try:

        return json.loads(text)

    except:

        pass

    try:

        match = re.search(
            r"\{.*\}",
            text,
            re.DOTALL
        )

        if match:

            return json.loads(
                match.group()
            )

    except:

        pass

    return {
        "important_clauses": []
    }

# ============================================================
# ANALYZE CONTRACT
# ============================================================

def analyze_nodes(
    nodes,
    contract_id
):

    context = []

    for node in nodes:

        context.append(
            f"""
SECTION TITLE:
{node.get("title")}

PAGE:
{node.get("page_index")}

CONTENT:
{node.get("text", "")}
"""
        )

    full_context = (
        "\n\n====================\n\n"
        .join(context)
    )

    prompt = f"""
You are an expert legal contract intelligence system.

Analyze the following contract sections.

IMPORTANT:
- Detect ALL legally risky clauses.
- Do NOT limit output to top risks.
- Merge related risks from the same section.
- Avoid duplicate sections.
- Ignore harmless administrative sections.

DETECT:
- indemnity clauses
- liability transfer
- unilateral termination
- hidden penalties
- dispute restrictions
- automatic renewals
- arbitration risks
- payment risks
- compliance obligations
- security deposit deductions
- liability caps
- financial penalties
- binding obligations
- unilateral authority clauses
- scope creep risks
- warranty risks
- confidentiality risks
- force majeure risks

FOR EACH RISK RETURN:

- section_title
- page
- risk_level
- risk_type
- criticality_score
- confidence
- legal_reason
- simple_reason
- recommendation
- highlighted_quotes

CRITICAL REQUIREMENT FOR highlighted_quotes:

highlighted_quotes.quote MUST be copied EXACTLY from CONTENT.

Before returning a quote:

1. Find the risky sentence inside CONTENT.
2. Copy the sentence directly from CONTENT.
3. Do NOT modify any word.
4. Do NOT rewrite grammar.
5. Do NOT summarize.
6. Do NOT paraphrase.
7. Do NOT shorten the sentence.
8. Do NOT combine multiple sections.
9. Do NOT invent text.
10. The quote MUST exist verbatim inside CONTENT.
11. The quote MUST come from the SAME PAGE and SAME SECTION as the risk.
12. Quotes must start and end at sentence boundaries.
13. Return 1-3 complete sentences copied exactly from CONTENT.
14. Preserve punctuation exactly as written.

VALID EXAMPLE:

CONTENT:
"The Institute shall have the right to terminate the agreement without assigning any reason."

QUOTE:
"The Institute shall have the right to terminate the agreement without assigning any reason."

INVALID EXAMPLE:

CONTENT:
"The Institute shall have the right to terminate the agreement without assigning any reason."

QUOTE:
"The Institute may terminate the agreement at any time."

The INVALID example changes wording and MUST NEVER be returned.

ALSO DETECT:

- contradictory clauses
- conflicting obligations

CONTRACT SECTIONS:

{full_context}

Return ONLY VALID JSON.

FORMAT:

{{
  "important_clauses": [
    {{
      "section_title": "",
      "page": 0,
      "risk_level": "",
      "risk_type": "",
      "criticality_score": 0,
      "confidence": 0,
      "legal_reason": "",
      "simple_reason": "",
      "recommendation": "",
      "highlighted_quotes": [
        {{
          "quote": "EXACT SENTENCE COPIED VERBATIM FROM CONTENT",
          "page": 0
        }}
      ],
      "cross_clause_conflicts": [
        {{
          "conflict_between": [],
          "simple_conflict_reason": ""
        }}
      ]
    }}
  ]
}}
"""

    response_text = safe_generate(
        prompt
    )

    if response_text == "ERROR":

        result = {
            "important_clauses": []
        }

        save_analysis(
            contract_id,
            result
        )

        return result

    response_text = (
        response_text
        .replace("```json", "")
        .replace("```", "")
        .strip()
    )

    result = extract_json(
        response_text
    )

    save_analysis(
        contract_id,
        result
    )

    return result

def analyze_gaps(nodes):
    """
    Calls Gemini to perform a Gap Analysis of missing critical boilerplate terms.
    """
    context = []
    for node in nodes[:15]:
        context.append(f"SECTION: {node.get('title')}\nCONTENT:\n{node.get('text', '')}")
    full_context = "\n\n".join(context)[:4000]

    prompt = f"""
You are an expert contract gap auditor. Review these contract sections:
====================
{full_context}
====================

Audit the contract and identify if any standard, critical legal boilerplate terms are missing that would normally be expected in a catering services, mess management, or general operations service agreement.
Verify missing clauses for:
1. Intellectual Property Rights (ownership of equipment, software, or tools)
2. Data Privacy & Confidentiality security regulations
3. Mutual Termination for convenience (checks if only the client can terminate)
4. Mediation / Dispute Escalation steps before entering formal Arbitration
5. Subcontracting restrictions or explicitly defined subcontracting boundaries

Return a valid JSON object only. Format:
{{
  "missing_clauses": [
    {{
      "title": "Missing Clause Name",
      "impact_severity": "HIGH" or "MEDIUM" or "LOW",
      "reason_missing": "Legal reason why its absence is a threat/risk.",
      "simple_explanation": "A user-friendly, plain-English explanation of what this clause does and why a non-legal reader should care that it is missing.",
      "draft_text": "Balanced, standard draft boilerplate text to insert to remedy the gap."
    }}
  ]
}}
"""
    response_text = safe_generate(prompt)
    if response_text == "ERROR":
        return {"missing_clauses": []}

    response_text = response_text.replace("```json", "").replace("```", "").strip()
    try:
        match = re.search(r"\{.*\}", response_text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        print(f"Error parsing gap analysis JSON: {e}")
    return {"missing_clauses": []}


def extract_metadata(nodes):
    """
    Calls Gemini to extract high-level contract metadata for the profile card.
    """
    context = []
    for node in nodes[:15]:
        context.append(f"SECTION: {node.get('title')}\nCONTENT:\n{node.get('text', '')}")
    full_context = "\n\n".join(context)[:4000]

    prompt = f"""
Analyze the introductory sections of this contract and extract the following metadata entities:
====================
{full_context}
====================

Return a valid JSON object only. Format:
{{
  "effective_date": "Date format e.g. June 12, 2026 or 'Not Specified'",
  "duration": "Duration e.g. 2 Years or 'Not Specified'",
  "first_party": "Name of the first party/institution (client)",
  "second_party": "Name of the second party (contractor/service provider) or 'Not Specified'",
  "jurisdiction": "Governing law/courts jurisdiction e.g. Kanpur Courts or 'Not Specified'"
}}
"""
    response_text = safe_generate(prompt)
    if response_text == "ERROR":
        return {
            "effective_date": "Not Specified",
            "duration": "Not Specified",
            "first_party": "Not Specified",
            "second_party": "Not Specified",
            "jurisdiction": "Not Specified"
        }

    response_text = response_text.replace("```json", "").replace("```", "").strip()
    try:
        match = re.search(r"\{.*\}", response_text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        print(f"Error parsing metadata JSON: {e}")
    return {
        "effective_date": "Not Specified",
        "duration": "Not Specified",
        "first_party": "Not Specified",
        "second_party": "Not Specified",
        "jurisdiction": "Not Specified"
    }


def find_placeholders(pdf_path):
    """
    Uses PyMuPDF (fitz) to scan PDF text and locate empty blanks, underlines, or placeholders.
    """
    placeholders = []
    seen_lines = set()
    try:
        import fitz
        doc = fitz.open(pdf_path)
        for page_idx, page in enumerate(doc):
            text = page.get_text()
            lines = text.split('\n')
            for line_idx, line in enumerate(lines):
                clean_line = line.strip()
                if not clean_line:
                    continue
                
                # Check if this line contains underscores, dots, or bracket parameters
                has_placeholder = (
                    re.search(r'_{3,}', clean_line) or 
                    re.search(r'\.{4,}', clean_line) or 
                    re.search(r'\[[^\]]*\]', clean_line)
                )
                
                if has_placeholder:
                    # Normalize structure to check for duplicate/repetitive layers
                    norm_line = re.sub(r'\s+', ' ', clean_line).strip().lower()
                    context_key = re.sub(r'_{3,}', '___', norm_line)
                    context_key = re.sub(r'\.{4,}', '...', context_key)
                    context_key = re.sub(r'\[[^\]]*\]', '[ ]', context_key)
                    
                    if context_key not in seen_lines:
                        seen_lines.add(context_key)
                        
                        # Find the first match to show as the badge
                        m = (
                            re.search(r'_{3,}', clean_line) or 
                            re.search(r'\.{4,}', clean_line) or 
                            re.search(r'\[[^\]]*\]', clean_line)
                        )
                        matched_text = m.group() if m else "________"
                        
                        # Construct a rich snippet using adjacent lines for context
                        prev_line = lines[line_idx-1].strip() if line_idx > 0 else ""
                        next_line = lines[line_idx+1].strip() if line_idx < len(lines)-1 else ""
                        context_snippet = f"... {prev_line} {clean_line} {next_line} ...".replace('\n', ' ').strip()
                        # Clean multiple spaces
                        context_snippet = re.sub(r'\s+', ' ', context_snippet)
                        
                        placeholders.append({
                            "placeholder": matched_text,
                            "page": page_idx + 1,
                            "context": context_snippet
                        })
    except Exception as e:
        print(f"Error extracting placeholders: {e}")
    return placeholders