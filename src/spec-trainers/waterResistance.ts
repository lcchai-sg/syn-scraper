export const waterResistance = {
    "document": [
        {
            "lang": "en",
            "word": "Water Resistance ",
            "intent": "waterResistance"
        },
        {
            "lang": "en",
            "word": " bars ",
            "intent": "waterResistance"
        },
        {
            "lang": "en",
            "word": " WR [Splash Resistant]",
            "intent": "waterResistance2"
        },
        {
            "lang": "en",
            "word": " meters feet ",
            "intent": "waterResistance"
        },
        {
            "lang": "en",
            "word": " Waterproof to ",
            "intent": "waterResistance"
        }
    ],
    "answer": [
        {
            "lang": "en",
            "intent": "waterResistance",
            "answer": "waterResistance:{{dimension}}"
        },
        {
            "lang": "en",
            "intent": "waterResistance2",
            "answer": "waterResistance:Splash Resistant"
        }
    ]
};