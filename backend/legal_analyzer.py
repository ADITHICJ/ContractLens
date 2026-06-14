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
- Detect ALL legally risky clauses
- Do NOT limit output to top risks
- Merge related risks from same section
- Avoid duplicate sections
- Ignore harmless administrative sections

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

ALSO DETECT:

- contradictory clauses
- conflicting obligations

DOCUMENT:
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
          "quote": "",
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