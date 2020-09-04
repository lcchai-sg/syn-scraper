import { NlpManager } from 'node-nlp';
import { bandBuckle } from './bandBuckle';
import { bandColor } from './bandColor';
import { bandMaterial } from './bandMaterial';
import { bandType } from './bandType';
import { caliberJewels } from './caliberJewels';
import { caliberReference } from './caliberReference';
import { caliberReserve } from './caliberReserve';
import { caliberType } from './caliberType';
import { caseBack } from './caseBack';
import { caseBezel } from './caseBezel';
import { caseCrystal } from './caseCrystal';
import { caseMaterial } from './caseMaterial';
import { caseShape } from './caseShape';
import { caseThickness } from './caseThickness';
import { caseWidth } from './caseWidth';
import { dialColor } from './dialColor';
import { dialFinish } from './dialFinish';
import { dialHandStyle } from './dialHandStyle';
import { dialIndexType } from './dialIndexType';
import { waterResistance } from './waterResistance';

const manager = new NlpManager({ languages: ['en'] });

// Band
for (const entity of bandBuckle.entity) {
    manager.addNamedEntityText(entity.id, entity.return, entity.lang, entity.word);
}
for (const doc of bandBuckle.document) {
    manager.addDocument(doc.lang, doc.word, doc.intent);
}
for (const answer of bandBuckle.answer) {
    manager.addAnswer(answer.lang, answer.intent, answer.answer);
}

for (const doc of bandColor.document) {
    manager.addDocument(doc.lang, doc.word, doc.intent);
}
for (const answer of bandColor.answer) {
    manager.addAnswer(answer.lang, answer.intent, answer.answer);
}

for (const doc of bandMaterial.document) {
    manager.addDocument(doc.lang, doc.word, doc.intent);
}
for (const answer of bandMaterial.answer) {
    manager.addAnswer(answer.lang, answer.intent, answer.answer);
}

for (const entity of bandType.entity) {
    manager.addNamedEntityText(entity.id, entity.return, entity.lang, entity.word);
}
for (const doc of bandType.document) {
    manager.addDocument(doc.lang, doc.word, doc.intent);
}
for (const answer of bandType.answer) {
    manager.addAnswer(answer.lang, answer.intent, answer.answer);
}

// Caliber
for (const doc of caliberJewels.document) {
    manager.addDocument(doc.lang, doc.word, doc.intent);
}
for (const answer of caliberJewels.answer) {
    manager.addAnswer(answer.lang, answer.intent, answer.answer);
}

for (const doc of caliberReference.document) {
    manager.addDocument(doc.lang, doc.word, doc.intent);
}
for (const answer of caliberReference.answer) {
    manager.addAnswer(answer.lang, answer.intent, answer.answer);
}

for (const doc of caliberReserve.document) {
    manager.addDocument(doc.lang, doc.word, doc.intent);
}
for (const answer of caliberReserve.answer) {
    manager.addAnswer(answer.lang, answer.intent, answer.answer);
}

for (const entity of caliberType.entity) {
    manager.addNamedEntityText(entity.id, entity.return, entity.lang, entity.word);
}
for (const doc of caliberType.document) {
    manager.addDocument(doc.lang, doc.word, doc.intent);
}
for (const answer of caliberType.answer) {
    manager.addAnswer(answer.lang, answer.intent, answer.answer);
}

// Case
for (const entity of caseBack.entity) {
    manager.addNamedEntityText(entity.id, entity.return, entity.lang, entity.word);
}
for (const doc of caseBack.document) {
    manager.addDocument(doc.lang, doc.word, doc.intent);
}
for (const answer of caseBack.answer) {
    manager.addAnswer(answer.lang, answer.intent, answer.answer);
}

for (const entity of caseBezel.entity) {
    manager.addNamedEntityText(entity.id, entity.return, entity.lang, entity.word);
}
for (const doc of caseBezel.document) {
    manager.addDocument(doc.lang, doc.word, doc.intent);
}
for (const answer of caseBezel.answer) {
    manager.addAnswer(answer.lang, answer.intent, answer.answer);
}

for (const entity of caseCrystal.entity) {
    manager.addNamedEntityText(entity.id, entity.return, entity.lang, entity.word);
}
for (const doc of caseCrystal.document) {
    manager.addDocument(doc.lang, doc.word, doc.intent);
}
for (const answer of caseCrystal.answer) {
    manager.addAnswer(answer.lang, answer.intent, answer.answer);
}

for (const entity of caseMaterial.entity) {
    manager.addNamedEntityText(entity.id, entity.return, entity.lang, entity.word);
}
for (const doc of caseMaterial.document) {
    manager.addDocument(doc.lang, doc.word, doc.intent);
}
for (const answer of caseMaterial.answer) {
    manager.addAnswer(answer.lang, answer.intent, answer.answer);
}


for (const entity of caseShape.entity) {
    manager.addNamedEntityText(entity.id, entity.return, entity.lang, entity.word);
}
for (const doc of caseShape.document) {
    manager.addDocument(doc.lang, doc.word, doc.intent);
}
for (const answer of caseShape.answer) {
    manager.addAnswer(answer.lang, answer.intent, answer.answer);
}

for (const doc of caseThickness.document) {
    manager.addDocument(doc.lang, doc.word, doc.intent);
}
for (const answer of caseThickness.answer) {
    manager.addAnswer(answer.lang, answer.intent, answer.answer);
}

for (const doc of caseWidth.document) {
    manager.addDocument(doc.lang, doc.word, doc.intent);
}
for (const answer of caseWidth.answer) {
    manager.addAnswer(answer.lang, answer.intent, answer.answer);
}

// Dial
for (const entity of dialColor.entity) {
    manager.addNamedEntityText(entity.id, entity.return, entity.lang, entity.word);
}
for (const doc of dialColor.document) {
    manager.addDocument(doc.lang, doc.word, doc.intent);
}
for (const answer of dialColor.answer) {
    manager.addAnswer(answer.lang, answer.intent, answer.answer);
}

for (const entity of dialFinish.entity) {
    manager.addNamedEntityText(entity.id, entity.return, entity.lang, entity.word);
}
for (const doc of dialFinish.document) {
    manager.addDocument(doc.lang, doc.word, doc.intent);
}
for (const answer of dialFinish.answer) {
    manager.addAnswer(answer.lang, answer.intent, answer.answer);
}

for (const entity of dialHandStyle.entity) {
    manager.addNamedEntityText(entity.id, entity.return, entity.lang, entity.word);
}
for (const doc of dialHandStyle.document) {
    manager.addDocument(doc.lang, doc.word, doc.intent);
}
for (const answer of dialHandStyle.answer) {
    manager.addAnswer(answer.lang, answer.intent, answer.answer);
}

for (const entity of dialIndexType.entity) {
    manager.addNamedEntityText(entity.id, entity.return, entity.lang, entity.word);
}
for (const doc of dialIndexType.document) {
    manager.addDocument(doc.lang, doc.word, doc.intent);
}
for (const answer of dialIndexType.answer) {
    manager.addAnswer(answer.lang, answer.intent, answer.answer);
}

// Water Resistance
for (const doc of waterResistance.document) {
    manager.addDocument(doc.lang, doc.word, doc.intent);
}
for (const answer of waterResistance.answer) {
    manager.addAnswer(answer.lang, answer.intent, answer.answer);
}

manager.train();
manager.save();