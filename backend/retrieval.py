from rank_bm25 import BM25Okapi

from utils import tokenize

LEGAL_RISK_TERMS = [

    "liability",
    "termination",
    "penalty",
    "arbitration",
    "indemnity",
    "dispute",
    "fine",
    "damages",
    "breach",
    "default",
    "jurisdiction",
    "confidentiality",
    "compliance",
    "obligation",
    "exclusive",
    "binding",
    "suspension",
    "force majeure",
    "payment",
    "delay",
    "interest",
    "renewal",
    "warranty",
    "limitation",
    "claims",
    "responsibility",
    "compensation",
    "deduction",
    "security deposit",
    "liquidated damages",
    "immediate termination",
    "sole arbitrator",
    "final decision"
]

IRRELEVANT_SECTIONS = [

    "preface",
    "introduction",
    "table of contents"
]


class ContractRetriever:

    def __init__(self, all_nodes):

        self.nodes = all_nodes

        corpus = []

        for node in all_nodes:

            text = (
                node.get("title", "")
                + " "
                + node.get("text", "")
            )

            corpus.append(
                tokenize(text)
            )

        if not corpus:

            raise Exception(
                "No nodes found in contract tree"
            )

        self.bm25 = BM25Okapi(corpus)

    def retrieve(self):

        retrieval_query = """
        dangerous risky clauses
        liability
        termination
        indemnity
        penalties
        arbitration
        confidentiality
        payment obligations
        automatic renewal
        force majeure
        compliance
        warranty
        dispute resolution
        """

        scores = self.bm25.get_scores(
            tokenize(retrieval_query)
        )

        ranked = []

        for idx, score in enumerate(scores):

            node = self.nodes[idx]

            text = (
                node.get("title", "")
                + " "
                + node.get("text", "")
            ).lower()

            boost = 0

            for term in LEGAL_RISK_TERMS:

                if term in text:

                    boost += 3

            if any(
                bad in text
                for bad in IRRELEVANT_SECTIONS
            ):

                boost -= 20

            ranked.append(
                (
                    score + boost,
                    node
                )
            )

        ranked.sort(
            reverse=True,
            key=lambda x: x[0]
        )

        TOP_K = 20

        retrieved_nodes = [

            node

            for _, node in ranked[:TOP_K]
        ]

        return retrieved_nodes