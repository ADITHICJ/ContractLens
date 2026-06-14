import re

STOPWORDS = {
    "the","is","a","an",
    "of","to","and",
    "in","for","on",
    "with","this","that",
    "be","should"
}

def tokenize(text):
    # Remove physical index tags to prevent indexing metadata terms
    cleaned_text = re.sub(r'<physical_index_\d+>', '', text.lower())
    
    words = re.findall(
        r"\w+",
        cleaned_text
    )

    return [
        word
        for word in words
        if word not in STOPWORDS and not word.isdigit()
    ]

def flatten_tree(nodes):

    flat = []

    for node in nodes:

        flat.append(node)

        if node.get("nodes"):

            flat.extend(
                flatten_tree(
                    node["nodes"]
                )
            )

    return flat