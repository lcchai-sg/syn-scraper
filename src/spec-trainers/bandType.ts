export const bandType = {
    "entity": [
        {
            "id": "bandtype",
            "return": "Bracelet",
            "lang": ['en'],
            "word": ['Bracelet']
        },
        {
            "id": "bandtype",
            "return": "Folding clasp",
            "lang": ['en'],
            "word": ['hand-stitched']
        }
    ],
    "document": [
        {
            "lang": "en",
            "word": "%bandtype% with AP folding clasp",
            "intent": "bandtype"
        },
        {
            "lang": "en",
            "word": "pin buckle %bandtype%",
            "intent": "bandtype"
        },
        {
            "lang": "en",
            "word": "%bandtype% Buckle With buckle",
            "intent": "bandtype"
        },
        {
            "lang": "en",
            "word": "%bandtype% strap",
            "intent": "bandtype"
        }
    ],
    "answer": [
        {
            "lang": "en",
            "intent": "bandtype",
            "answer": "bandtype:{{bandtype}}"
        }
    ]
};