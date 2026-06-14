import re

STOPWORDS = {
    "the","is","a","an",
    "of","to","and",
    "in","for","on",
    "with","this","that",
    "be","should"
}

def tokenize(text):

    words = re.findall(
        r"\w+",
        text.lower()
    )

    return [

        word

        for word in words

        if word not in STOPWORDS
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