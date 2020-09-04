export const caliberType = {
    "entity": [
        {
            "id": "calibertype",
            "return": "quartz",
            "lang": ['en'],
            "word": ['quartz']
        },
        {
            "id": "calibertype",
            "return": "hand wind",
            "lang": ['en'],
            "word": ['manual', 'manual winding', 'hand winding']
        },
        {
            "id": "calibertype",
            "return": "automatic",
            "lang": ['en'],
            "word": ['mechanical', 'automatic', 'self winding', 'self-winding']
        }
    ],
    "document": [
        {
            "lang": "en",
            "word": "mechanism  Powered by the natural movements of your wrist.  %calibertype% ",
            "intent": "calibertype"
        },
        {
            "lang": "en",
            "word": "%calibertype% mechanical",
            "intent": "calibertype"
        },
        {
            "lang": "en",
            "word": "%calibertype% movement ",
            "intent": "calibertype"
        }
    ],
    "answer": [
        {
            "lang": "en",
            "intent": "calibertype",
            "answer": "calibertype:{{calibertype}}"
        }
    ]
};