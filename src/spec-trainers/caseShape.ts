export const caseShape = {
    "entity": [
        {
            "id": "caseshape",
            "return": "round",
            "lang": ['en'],
            "word": ['round']
        },
        {
            "id": "caseshape",
            "return": "oval",
            "lang": ['en'],
            "word": ['oval']
        }
    ],
    "document": [
        {
            "lang": "en",
            "word": "Watch Specifications  Calibre %caseshape% shape",
            "intent": "caseshape"
        },
        {
            "lang": "en",
            "word": "Case shape %caseshape%",
            "intent": "caseshape"
        }
    ],
    "answer": [
        {
            "lang": "en",
            "intent": "caseshape",
            "answer": "caseshape:{{caseshape}}"
        }
    ]
};