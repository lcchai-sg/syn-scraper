export const dialHandStyle = {
    "entity": [
        {
            "id": "dialhandStyle",
            "return": "Rhodium Plated",
            "lang": ['en'],
            "word": ['rhodium-plated']
        },
        {
            "id": "dialhandStyle",
            "return": "Luminous",
            "lang": ['en'],
            "word": ['Luminous']
        },
        {
            "id": "dialhandStyle",
            "return": "Baton",
            "lang": ['en'],
            "word": ['Baton']
        }
    ],
    "document": [
        {
            "lang": "en",
            "word": "polished and %dialhandStyle% , seconds hand red",
            "intent": "dialhandStyle"
        },
        {
            "lang": "en",
            "word": "%dialhandStyle% Hands , seconds hand red",
            "intent": "dialhandStyle"
        },
        {
            "lang": "en",
            "word": "Special luxury finish with %dialhandStyle% rotor and bridges with Geneva waves in arabesque",
            "intent": "dialhandStyle"
        },
        {
            "lang": "en",
            "word": "%dialhandStyle% Hands and Markers",
            "intent": "dialhandStyle"
        }
    ],
    "answer": [
        {
            "lang": "en",
            "intent": "dialhandStyle",
            "answer": "dialhandStyle:{{dialhandStyle}}"
        }
    ]
};