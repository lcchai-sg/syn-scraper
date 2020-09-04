export const dialColor = {
    "entity": [
        {
            "id": "color",
            "return": "multicolored",
            "lang": ['en'],
            "word": ['multicolor', 'multi color', 'opaline', 'motif', 'natural mother-of-pearl, blue, black or champagne']
        },
        {
            "id": "color",
            "return": "meteorite",
            "lang": ['en'],
            "word": ['meteorite']
        },
        {
            "id": "color",
            "return": "skeleton",
            "lang": ['en'],
            "word": ['skeleton', 'openworked', 'open work']
        },
        {
            "id": "color",
            "return": "mother of pearl",
            "lang": ['en'],
            "word": ['mother of pearl', 'MOP', 'mother-of-pearl']
        },
        {
            "id": "color",
            "return": "digital",
            "lang": ['en'],
            "word": ['digital']
        },
        {
            "id": "color",
            "return": "silver",
            "lang": ['en'],
            "word": ['silver', 'rhodium', 'platinum', 'steel']
        },
        {
            "id": "color",
            "return": "black",
            "lang": ['en'],
            "word": ['Black', 'black', 'carbon', 'anthracite']
        },
        {
            "id": "color",
            "return": "white",
            "lang": ['en'],
            "word": ['white']
        },
        {
            "id": "color",
            "return": "blue",
            "lang": ['en'],
            "word": ['blue', 'ice', 'navy']
        },
        {
            "id": "color",
            "return": "green",
            "lang": ['en'],
            "word": ['green', 'olive']
        },
        {
            "id": "color",
            "return": "champagne",
            "lang": ['en'],
            "word": ['champagne']
        },
        {
            "id": "color",
            "return": "gold",
            "lang": ['en'],
            "word": ['gold']
        },
        {
            "id": "color",
            "return": "pink",
            "lang": ['en'],
            "word": ['pink']
        },
        {
            "id": "color",
            "return": "grey",
            "lang": ['en'],
            "word": ['grey', 'smoke', 'ruthenium', 'gray']
        },
        {
            "id": "color",
            "return": "brown",
            "lang": ['en'],
            "word": ['brown', 'chocolate', 'cognac']
        },
        {
            "id": "color",
            "return": "bronze",
            "lang": ['en'],
            "word": ['bronze']
        },
        {
            "id": "color",
            "return": "red",
            "lang": ['en'],
            "word": ['red', 'cherry']
        },
        {
            "id": "color",
            "return": "ivory",
            "lang": ['en'],
            "word": ['ivory']
        },
        {
            "id": "color",
            "return": "purple",
            "lang": ['en'],
            "word": ['purple', 'lavender']
        },
        {
            "id": "color",
            "return": "beige",
            "lang": ['en'],
            "word": ['beige']
        },
        {
            "id": "color",
            "return": "cream",
            "lang": ['en'],
            "word": ['cream']
        },
        {
            "id": "color",
            "return": "yellow",
            "lang": ['en'],
            "word": ['yellow']
        }
    ],
    "document": [
        {
            "lang": "en",
            "word": "Dial %color% dial with ",
            "intent": "dial.color"
        },
        {
            "lang": "en",
            "word": "Dial %color% sun-brushed with luminous Arabic numerals and hour markers",
            "intent": "dial.color"
        },
        {
            "lang": "en",
            "word": "Not forgetting a choice of four dials (%color%)",
            "intent": "dial.color"
        }
    ],
    "answer": [
        {
            "lang": "en",
            "intent": "dial.color",
            "answer": "dial.color:{{color}}"
        }
    ]
};