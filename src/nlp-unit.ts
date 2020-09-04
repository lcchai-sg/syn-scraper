import { Logger } from '@cosmos/logger';
const logger = Logger.getLogger('cs:syno:nlp', 'debug');
import { NlpManager } from 'node-nlp';
import fs from 'fs';
import _ from 'lodash';

export class NlpUnit {
    private manager;

    constructor(private readonly datafile = 'model.nlp') {
        this.manager = new NlpManager({ languages: ['en'], processTransformer: this.transformer });
        if (fs.existsSync(this.datafile)) {
            this.manager.load(this.datafile);
        }
    }

    transformer = async original => {
        const facts = [];
        const types = _.reduce(original.entities, (r, c) => {
            r[c.entity] = c;
            return r;
        }, {});
        const idx = Object.keys(types);
        if (idx.indexOf('feature') > -1) {
            // feature exists
            const feat = types['feature'];
            const dem = types['dimension'] || types['duration'];
            facts.push({
                key: feat.option,
                value: (dem) ? dem.utteranceText : ''
            })
        } else if (idx.indexOf('measure') > -1) {
            // measure value
            const mes = types['measure'];
            const val = types['dimension'] || types['duration'];
            facts.push({
                key: mes.option,
                value: (val) ? val.utteranceText : ''
            })
        } else {
            for (const id of idx) {
                if (['parts', 'number'].indexOf(id) > -1) continue;
                const fact = types[id];
                facts.push({
                    key: id,
                    value: fact.option
                })
            }
        }
        return facts;
    };

    save() {
        this.manager.save(this.datafile)
    }

    async parse(fact) {
        let input = fact;
        if (typeof fact === 'object') {
            input = fact.value;
        }
        let result = [];
        for (const norm of input.replace(/\s+/g, ' ').split(/[,.\n]/)) {
            result.push(...(await this.manager.process('en', norm)));
        }
        return result;
    }

    async digest(input) {
        const result = { additional: [] };
        for (const attr of ['gender', 'collection', 'subCollection',
            'description', 'name', 'related', 'pair', 'price', 'url']) {
            if (input[attr])
                _.set(result, attr, input[attr])
        }

        for (const s of input.spec) {
            const splitBasedPeriod = s.value.split('.');
            if (splitBasedPeriod) {
                for (const word of splitBasedPeriod) {
                    const facts = await this.parse(word);
                    if (facts) {
                        for (const { key, value } of facts) {
                            if (['case', 'band', 'bracelet', 'bezel'].indexOf(s.key.toLowerCase()) > -1
                                && ['material', 'coating'].indexOf(key) > -1) {
                                _.set(result, `${s.key.toLowerCase()}.${key}`, value)
                            } else if (['dial', 'case', 'bezel', 'band', 'bracelet'].indexOf(s.key.toLowerCase()) > -1
                                && ['color'].indexOf(key) > -1) {
                                _.set(result, `${s.key.toLowerCase()}.${key}`, value)
                            } else {
                                if (['material', 'color'].indexOf(key) > -1) continue;
                                _.set(result, key, value)
                            }
                        }
                    } else {
                        result.additional.push(s)
                    }
                }
            }
        }
        return result;
    }

    addNamedFacts(...facts) {
        for (const fact of facts) {
            this.manager.addNamedEntityText(
                fact.entity,
                fact.option,
                fact.lang,
                fact.text
            )
        }
    }

    addRegexFacts(...facts) {
        for (const fact of facts) {
            this.manager.addRegexEntity(
                fact.entity,
                fact.language,
                fact.regex
            )
        }
    }

    addTrimEntity(...facts) {
        for (const fact of facts) {
            const entity = this.manager.addTrimEntity(fact.entity);
            switch (fact.condition) {
                case 'between':
                    entity.addBetweeenCondition(
                        fact.language,
                        ...fact.terms
                    );
                    break;
                case 'after':
                    entity.addAfterCondition(
                        fact.language,
                        fact.terms
                    );
                    break;
                case 'afterFirst':
                    entity.addAfterFirstCondition(
                        fact.language,
                        fact.terms
                    );
                    break;
                case 'afterLast':
                    entity.addAfterLastCondition(
                        fact.language,
                        fact.terms
                    );
                    break;
                case 'before':
                    entity.addBeforeCondition(
                        fact.language,
                        fact.terms
                    );
                    break;
                case 'beforeFirst':
                    entity.addBeforeFirstCondition(
                        fact.language,
                        fact.terms
                    );
                    break;
                case 'beforeLast':
                    entity.addBeforeLastCondition(
                        fact.language,
                        fact.terms
                    );
                    break;

            }
        }
    }

    addDocuments(...docs) {
        for (const doc of docs) {
            this.manager.addDocument(
                doc.language,
                doc.content,
                doc.intent
            )
        }
    }

    async train() {
        return this.manager.train();
    }
}
