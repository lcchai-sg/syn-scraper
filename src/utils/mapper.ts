interface DataMapper<K, V> {
    map(input: K): V
}

export class generateBrandID implements DataMapper<String, any> {
    map(input: String): any {
        if (!input) return { id: null, name: null };

        if (input.match(/suunto/i)) {
            return { id: 184, name: 'Suunto' };
        }
        if (input.match(/cvstos/i)) {
            return { id: 186, name: 'Cvstos' };
        }
        if (input.match(/ball/i)) {
            return { id: 188, name: 'Ball' };
        }
        if (input.match(/baume et mercier|baumeetmercier|baume-et-mercier|baumemercier|baume-mercier/i)) {
            return { id: 178, name: "Baume et Mercier" };
        }
        if (input.match(/gerald genta|geraldgenta|gerald-genta/i)) {
            return { "id": 176, "name": "Gerald Genta" };
        }
        if (input.match(/sinn/i)) {
            return { "id": 180, "name": "SINN" };
        }
        if (input.match(/rolex/i)) {
            return { "id": 1, "name": "Rolex" };
        }
        if (input.match(/tudor/i)) {
            return { "id": 2, "name": "Tudor" };
        }
        if (input.match(/aboutvintage|about vintage|about-vintage/i)) {
            return { "id": 152, "name": "About Vintage" };
        }
        if (input.match(/audemarspiguet|audemars piguet|audemars-piguet/i)) {
            return { "id": 18, "name": "Audemars Piguet" };
        }
        if (input.match(/bellross|bell ross|bell-ross|bell&ross|bell & ross/i)) {
            return { "id": 112, "name": "Bell & Ross" };
        }
        if (input.match(/blancpain/i)) {
            return { "id": 52, "name": "Blancpain" };
        }
        if (input.match(/breguet/i)) {
            return { "id": 132, "name": "Breguet" };
        }
        if (input.match(/breitling/i)) {
            return { "id": 118, "name": "Breitling" };
        }
        if (input.match(/bulgari|bvlgari/i)) {
            return { "id": 32, "name": "Bvlgari" };
        }
        if (input.match(/cartier/i)) {
            return { "id": 28, "name": "Cartier" };
        }
        if (input.match(/casio/i)) {
            return { "id": 76, "name": "Casio" };
        }
        if (input.match(/chanel/i)) {
            return { "id": 70, "name": "Chanel" };
        }
        if (input.match(/chopard/i)) {
            return { "id": 44, "name": "Chopard" };
        }
        if (input.match(/citizen/i)) {
            return { "id": 86, "name": "Citizen" };
        }
        if (input.match(/frédérique constant|frederiqueconstant|frederique constant|frederique-constant/i)) {
            return { "id": 154, "name": "Frédérique Constant" };
        }
        if (input.match(/gagamilano|gaga milano|gaga-milano/i)) {
            return { "id": 96, "name": "Gaga Milano" };
        }
        if (input.match(/girardperregaux|girard perregaux|girard-perregaux/i)) {
            return { "id": 98, "name": "Girard-Perregaux" };
        }
        if (input.match(/glashuette/i)) {
            return { "id": 168, "name": "Glashutte Original" };
        }
        if (input.match(/grand-seiko|grandseiko|grand seiko/i)) {
            return { "id": 84, "name": "Grand Seiko" };
        }
        if (input.match(/gucci/i)) {
            return { "id": 156, "name": "Gucci" };
        }
        if (input.match(/hamilton/i)) {
            return { "id": 62, "name": "Hamilton" };
        }
        if (input.match(/hermes/i)) {
            return { "id": 64, "name": "Hermes" };
        }
        if (input.match(/hublot/i)) {
            return { "id": 46, "name": "Hublot" };
        }
        if (input.match(/iwc/i)) {
            return { "id": 4, "name": "IWC" };
        }
        if (input.match(/jaegerlecoultre|jaeger lecoultre|jaeger-lecoultre/i)) {
            return { "id": 16, "name": "Jaeger LeCoultre" };
        }
        if (input.match(/jaquetdroz|jaquet droz|jaquet-droz/i)) {
            return { "id": 174, "name": "Jaquet Droz" };
        }
        if (input.match(/longines/i)) {
            return { "id": 120, "name": "Longines" };
        }
        if (input.match(/mauricelacroix|maurice lacroix|maurice-lacroix/i)) {
            return { "id": 26, "name": "Maurice Lacroix" };
        }
        if (input.match(/montblanc/i)) {
            return { "id": 5, "name": "Montblanc" };
        }
        if (input.match(/nomos glashütte|nomosglashuette|nomos glashuette|nomos-glashuette/i)) {
            return { "id": 134, "name": "Nomos Glashütte" };
        }
        if (input.match(/omega/i)) {
            return { "id": 20, "name": "Omega" };
        }
        if (input.match(/orient/i)) {
            return { "id": 100, "name": "Orient" };
        }
        if (input.match(/oris/i)) {
            return { "id": 164, "name": "Oris" };
        }
        if (input.match(/panerai/i)) {
            return { "id": 58, "name": "Panerai" };
        }
        if (input.match(/parmigiani/i)) {
            return { "id": 158, "name": "Parmigiani Fleurier" };
        }
        if (input.match(/patek/i)) {
            return { "id": 22, "name": "Patek Philippe" };
        }
        if (input.match(/piaget/i)) {
            return { "id": 56, "name": "Piaget" };
        }
        if (input.match(/rado/i)) {
            return { "id": 160, "name": "Rado" };
        }
        if (input.match(/seiko/i)) {
            return { "id": 72, "name": "Seiko" };
        }
        if (input.match(/sevenfriday|seven friday|seven-friday/i)) {
            return { "id": 142, "name": "Sevenfriday" };
        }
        if (input.match(/tagheuer|tag heuer|tag-heuer/i)) {
            return { "id": 54, "name": "TAG Heuer" };
        }
        if (input.match(/tissot/i)) {
            return { "id": 82, "name": "Tissot" };
        }
        if (input.match(/ulysse|ulysse-nardin|ulysse nardin/i)) {
            return { "id": 162, "name": "Ulysse Nardin" };
        }
        if (input.match(/vacheronconstantin|vacheron constantin|vacheron-constantin/i)) {
            return { "id": 3, "name": "Vacheron Constantin" };
        }
        if (input.match(/zenith/i)) {
            return { "id": 80, "name": "Zenith" };
        }
        if (input.match(/mido/i)) {
            return { "id": 172, "name": "MIDO" };
        }
        if (input.match(/franck muller|franck-muller|franckmuller/i)) {
            return { "id": 30, "name": "Franck Muller" };
        }
        if (input.match(/louis vuitton|louis-vuitton|louisvuitton/i)) {
            return { "id": 130, "name": "LOUIS VUITTON" };
        }
        if (input.match(/Hugo Boss|hugo-boss|hugoboss/i)) {
            return { "id": 192, "name": "Hugo Boss" };
        }
        if (input.match(/Michael Kors|michaelkors|michael-kors/i)) {
            return { "id": 190, "name": "Michael Kors" };
        }
        return { id: null, name: input };
    }
}

