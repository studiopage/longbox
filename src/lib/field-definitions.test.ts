import { describe, it, expect } from 'vitest';
import { FIELD_DEFINITIONS, OPERATOR_LABELS } from './field-definitions';

describe('FIELD_DEFINITIONS data integrity', () => {
  it('every field has at least one operator', () => {
    for (const field of FIELD_DEFINITIONS) {
      expect(field.operators.length, `${field.field} should have operators`).toBeGreaterThan(0);
    }
  });

  it('every operator has a label in OPERATOR_LABELS', () => {
    const allOperators = FIELD_DEFINITIONS.flatMap(f => f.operators);
    for (const op of allOperators) {
      expect(OPERATOR_LABELS[op], `Operator "${op}" should have a label`).toBeDefined();
    }
  });

  it('no duplicate field entries', () => {
    const fields = FIELD_DEFINITIONS.map(f => f.field);
    expect(new Set(fields).size).toBe(fields.length);
  });

  it('enum fields have enumValues defined', () => {
    const enumFields = FIELD_DEFINITIONS.filter(f => f.valueType === 'enum');
    for (const field of enumFields) {
      expect(field.enumValues, `${field.field} should have enumValues`).toBeDefined();
      expect(field.enumValues!.length, `${field.field} enumValues should not be empty`).toBeGreaterThan(0);
    }
  });

  it('boolean fields only have is_true/is_false operators', () => {
    const boolFields = FIELD_DEFINITIONS.filter(f => f.valueType === 'boolean');
    for (const field of boolFields) {
      for (const op of field.operators) {
        expect(['is_true', 'is_false']).toContain(op);
      }
    }
  });

  it('has expected number of fields', () => {
    expect(FIELD_DEFINITIONS.length).toBe(15);
  });
});
