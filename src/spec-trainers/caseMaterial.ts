export const caseMaterial = {
    "entity": [
        {
            "id": "material",
            "return": "stainless steel",
            "lang": ['en'],
            "word": ['steel', 'stainless steel']
        },
        {
            "id": "material",
            "return": "yellow gold",
            "lang": ['en'],
            "word": ['18kt yellow gold', '18ct yellow gold', 'yellow gold']
        },
        {
            "id": "material",
            "return": "rose gold",
            "lang": ['en'],
            "word": ['18kt rose gold', 'rose gold', '18ct rose gold', 'pink gold']
        },
        {
            "id": "material",
            "return": "aluminium",
            "lang": ['en'],
            "word": ['aluminium', 'aluminum']
        },
        {
            "id": "material",
            "return": "iron",
            "lang": ['en'],
            "word": ['iron']
        },
        {
            "id": "material",
            "return": "metal",
            "lang": ['en'],
            "word": ['metal']
        },
        {
            "id": "material",
            "return": "alligator leather",
            "lang": ['en'],
            "word": ['alligator leather', 'alligator skin', 'Crocodile', 'Alligator']
        },
        {
            "id": "material",
            "return": "silicon",
            "lang": ['en'],
            "word": ['silicon']
        },
        {
            "id": "material",
            "return": "titanium",
            "lang": ['en'],
            "word": ['titanium']
        },
        {
            "id": "material",
            "return": "rubber",
            "lang": ['en'],
            "word": ['rubber']
        },
        {
            "id": "material",
            "return": "cermet",
            "lang": ['en'],
            "word": ['cermet']
        },
        {
            "id": "material",
            "return": "cemented carbide",
            "lang": ['en'],
            "word": ['cemented carbide']
        },
        {
            "id": "material",
            "return": "Crocodile",
            "lang": ['en'],
            "word": ['Crocodile']
        },
        {
            "id": "material",
            "return": "Leather",
            "lang": ['en'],
            "word": ['Leather']
        },
        {
            "id": "material",
            "return": "calfskin",
            "lang": ['en'],
            "word": ['calfskin']
        },
        {
            "id": "material",
            "return": "Oystersteel",
            "lang": ['en'],
            "word": ['Oystersteel']
        },
        {
            "id": "material",
            "return": "white gold",
            "lang": ['en'],
            "word": ['white gold']
        },
        {
            "id": "material",
            "return": "Jubilee",
            "lang": ['en'],
            "word": ['Jubilee']
        }
    ],
    "document": [
        {
            "lang": "en",
            "word": "case %material% case ",
            "intent": "case.material"
        },
        {
            "lang": "en",
            "word": "Case Material %material% ",
            "intent": "case.material"
        }
    ],
    "answer": [
        {
            "lang": "en",
            "intent": "case.material",
            "answer": "case.material:{{material}}"
        }
    ]
};