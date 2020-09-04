export const caseBezel = {
    "entity": [
        {
            "id": "casebezel",
            "return": "Annular",
            "lang": ['en'],
            "word": ['Annular']
        },
        {
            "id": "casebezel",
            "return": "Smooth",
            "lang": ['en'],
            "word": ['Smooth']
        },
        {
            "id": "casebezel",
            "return": "Bidirectional",
            "lang": ['en'],
            "word": ['Bidirectional']
        },
        {
            "id": "casebezel",
            "return": "Sandblasted",
            "lang": ['en'],
            "word": ['Sandblasted']
        },
        {
            "id": "casebezel",
            "return": "Tungsten Carbide",
            "lang": ['en'],
            "word": ['tungsten carbide']
        }
    ],
    "document": [
        {
            "lang": "en",
            "word": "Balance-spring type  %casebezel% ",
            "intent": "casebezel"
        },
        {
            "lang": "en",
            "word": "%casebezel%, slide rule",
            "intent": "casebezel"
        },
        {
            "lang": "en",
            "word": "Bezel %casebezel%,",
            "intent": "casebezel"
        },
        {
            "lang": "en",
            "word": "With a bezel in %casebezel%",
            "intent": "casebezel"
        }
    ],
    "answer": [
        {
            "lang": "en",
            "intent": "casebezel",
            "answer": "casebezel:{{casebezel}}"
        }
    ]
};