// Tests de la lógica compartida de formularios. Correr con: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeWhatsapp, validateWhatsapp, validateEmail, validateNombre, computeOrigin,
  firstName, MESSAGES
} from '../assets/js/form-core.js';

const ok = (input, expected) => {
  const r = normalizeWhatsapp(input);
  assert.equal(r.ok, true, `"${input}" debería ser válido`);
  assert.equal(r.value, expected, `"${input}"`);
};
const bad = (input) => assert.equal(normalizeWhatsapp(input).ok, false, `"${input}" debería ser inválido`);

test('WhatsApp de Tucumán en todos los formatos comunes', () => {
  for (const input of [
    '3816378896', '381 637 8896', '381-637-8896', '(381) 637-8896',
    '03816378896', '0381 637 8896',
    '381 15 637 8896', '0381 15 637 8896', '0381-15-637-8896', '38115 6378896',
    '+54 9 381 637 8896', '+549 3816378896', '5493816378896', '543816378896',
    '+54 381 637 8896', '+54 9 381 15 637 8896', '0054 9 381 637 8896'
  ]) ok(input, '5493816378896');
});

test('Característica de 2 dígitos (CABA)', () => {
  ok('11 2345 6789', '5491123456789');
  ok('011 15 2345 6789', '5491123456789');
  ok('+54 9 11 2345-6789', '5491123456789');
});

test('Característica de 4 dígitos (Concepción, Tucumán)', () => {
  ok('3865 42 1234', '5493865421234');
  ok('03865 15 42 1234', '5493865421234');
});

test('Otras de 3 dígitos (Córdoba, Rosario, Salta)', () => {
  ok('351 15 555 1234', '5493515551234');
  ok('0341 555 1234', '5493415551234');
  ok('387 455 1234', '5493874551234');
});

test('Números incompletos o inválidos', () => {
  for (const input of ['', '   ', '15 637 8896', '637 8896', '12345', 'hola', '381 637 88961234', '800 555 1234']) bad(input);
});

test('Número internacional con +', () => {
  const r = normalizeWhatsapp('+593 99 123 4567');
  assert.equal(r.ok, true);
  assert.equal(r.value, '593991234567');
  assert.equal(r.international, true);
});

test('Mensajes de error con voseo', () => {
  assert.equal(validateWhatsapp(''), MESSAGES.whatsappEmpty);
  assert.equal(validateWhatsapp('123'), MESSAGES.whatsappInvalid);
  assert.equal(validateWhatsapp('381 637 8896'), null);
  assert.equal(validateNombre(' '), MESSAGES.nombre);
  assert.equal(validateNombre('Ana'), null);
});

test('Email opcional u obligatorio', () => {
  assert.equal(validateEmail('', { required: false }), null);
  assert.equal(validateEmail('', { required: true }), MESSAGES.emailEmpty);
  assert.equal(validateEmail('ana@', {}), MESSAGES.emailInvalid);
  assert.equal(validateEmail('ana@negocio.com.ar', {}), null);
});

test('Origen: los UTM mandan', () => {
  const o = computeOrigin({ search: '?utm_source=instagram&utm_medium=bio&utm_campaign=turnos', referrer: '', userAgent: 'Mozilla' });
  assert.deepEqual(
    [o.origen, o.utm_source, o.utm_medium, o.utm_campaign, o.instagramBrowser],
    ['instagram', 'instagram', 'bio', 'turnos', false]
  );
});

test('Origen: sin UTM y referrer de Instagram => instagram', () => {
  assert.equal(computeOrigin({ referrer: 'https://l.instagram.com/?u=x', userAgent: 'Mozilla' }).origen, 'instagram');
});

test('Origen: sin UTM ni referrer pero navegador interno de Instagram => instagram', () => {
  const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 300.0.0.0';
  const o = computeOrigin({ userAgent: ua });
  assert.equal(o.origen, 'instagram');
  assert.equal(o.instagramBrowser, true);
});

test('Origen: otro referrer o entrada directa', () => {
  assert.equal(computeOrigin({ referrer: 'https://www.google.com/' }).origen, 'www.google.com');
  assert.equal(computeOrigin({}).origen, 'directo');
});

test('Primer nombre para la confirmación', () => {
  assert.equal(firstName('  Juan Pérez '), 'Juan');
});
