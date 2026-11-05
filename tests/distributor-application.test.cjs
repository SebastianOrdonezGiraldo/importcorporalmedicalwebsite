const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createTypeScriptLoader } = require('./helpers/typescript.cjs');
const { prepareDistributorApplication, APPLICATION_LIMITS } = createTypeScriptLoader()(path.resolve(__dirname, '../src/lib/distributor-application.ts'));
const availableLines = ['Electroterapia', 'Masaje'];

function application(overrides = {}) {
  const fd = new FormData();
  const data = { company: 'Empresa de prueba', nit: '900123456-7', name: 'Contacto de prueba', phone: '3000000000', city: 'Armenia', type: 'Otro', msg: '', ...overrides };
  for (const [key, value] of Object.entries(data)) fd.set(key, value);
  return fd;
}

for (const field of ['company', 'name', 'city']) {
  test(`${field} cannot consist only of whitespace`, () => {
    const result = prepareDistributorApplication(application({ [field]: ' \t\n ' }), availableLines);
    assert.equal(result.ok, false);
    assert.ok(result.errors[field]);
    assert.equal(result.message, undefined);
  });
}

test('phone numbers require digits and reject malformed prefixes, letters and unreasonable lengths', () => {
  for (const phone of ['          ', '++++++++++', '+', '123456789', '1234567890123456', '300ABC1234', '300+0000000', '++573000000000']) {
    const result = prepareDistributorApplication(application({ phone }), availableLines);
    assert.equal(result.ok, false, phone);
    assert.ok(result.errors.phone, phone);
    assert.equal(result.message, undefined);
  }
});

test('accepted phone formatting is normalized while retaining an explicit international prefix', () => {
  for (const [phone, expected] of [['300 000 0000', '3000000000'], ['+57 (300) 000-0000', '+573000000000'], ['123456789012345', '123456789012345']]) {
    const result = prepareDistributorApplication(application({ phone }), availableLines);
    assert.equal(result.ok, true);
    assert.equal(result.data.phone, expected);
    assert.ok(result.message.includes(`Celular: ${expected}`));
  }
});

test('NIT and identity formatting accepts optional verification digits and rejects invalid structures', () => {
  for (const [nit, normalized] of [['900.123.456-7', '900123456-7'], ['900123456', '900123456'], ['12345678901', '12345678901']]) {
    const result = prepareDistributorApplication(application({ nit }), availableLines);
    assert.equal(result.ok, true);
    assert.equal(result.data.nit, normalized);
  }
  for (const nit of [' ', '12345', 'ABC900123', '900123456-78', '123456789012', '-900123456']) {
    const result = prepareDistributorApplication(application({ nit }), availableLines);
    assert.equal(result.ok, false, nit);
    assert.ok(result.errors.nit, nit);
  }
});

test('field limits reject oversized input instead of silently changing the request', () => {
  for (const [field, max] of Object.entries(APPLICATION_LIMITS)) {
    const result = prepareDistributorApplication(application({ [field]: 'x'.repeat(max + 1) }), availableLines);
    assert.equal(result.ok, false, field);
    assert.ok(result.errors[field], field);
  }
});

test('messages use current normalized values and preserve multiline comments', () => {
  const result = prepareDistributorApplication(application({ company: '  Empresa   de prueba  ', name: '  Ana  Pérez ', city: '  Bogotá ', msg: '  Pregunta uno\r\nPregunta dos  ' }), availableLines);
  assert.equal(result.ok, true);
  assert.equal(result.data.company, 'Empresa de prueba');
  assert.ok(result.message.includes('Contacto: Ana Pérez'));
  assert.ok(result.message.includes('Ciudad: Bogotá'));
  assert.ok(result.message.includes('Comentarios: Pregunta uno\nPregunta dos'));
  const changed = prepareDistributorApplication(application({ city: 'Medellín' }), availableLines);
  assert.equal(changed.ok, true);
  assert.notEqual(changed.message, result.message);
});

test('selected lines are restricted to the current catalog and deduplicated', () => {
  const fd = application();
  fd.append('lines', 'Masaje');
  fd.append('lines', 'Masaje');
  const result = prepareDistributorApplication(fd, availableLines);
  assert.equal(result.ok, true);
  assert.equal(result.data.lines.length, 1);
  assert.ok(result.message.includes('Líneas de interés: Masaje'));
  fd.append('lines', 'Línea eliminada');
  const invalid = prepareDistributorApplication(fd, availableLines);
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.lines);
});

test('optional fields may be empty and unknown business types are rejected', () => {
  const result = prepareDistributorApplication(application({ type: '', msg: '' }), []);
  assert.equal(result.ok, true);
  assert.ok(!result.message.includes('Tipo de negocio:'));
  assert.ok(!result.message.includes('Comentarios:'));
  const invalid = prepareDistributorApplication(application({ type: 'Opción inexistente' }), availableLines);
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.type);
});

test('non-text form entries cannot become contact data', () => {
  const fd = application();
  fd.set('company', new Blob(['data']), 'unexpected.txt');
  const result = prepareDistributorApplication(fd, availableLines);
  assert.equal(result.ok, false);
  assert.ok(result.errors.company);
});
