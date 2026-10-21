// Deliberately bounded validator for the checked-in JSON Schema subset, no external dependency.
import { readFileSync } from 'node:fs';
import path from 'node:path';
export function validateSchema(value, schema, directory) {
  function check(v, s) {
    if (s.$ref) return check(v, JSON.parse(readFileSync(path.join(directory, s.$ref), 'utf8')));
    if ('const' in s && v !== s.const) throw new Error('SCHEMA_CONST');
    if (s.enum && !s.enum.includes(v)) throw new Error('SCHEMA_ENUM');
    const type = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v === 'number' && Number.isInteger(v) ? 'integer' : typeof v;
    if (s.type && !(Array.isArray(s.type) ? s.type.includes(type) : type === s.type || (s.type === 'number' && type === 'integer'))) throw new Error('SCHEMA_TYPE');
    if (s.minimum !== undefined && v < s.minimum) throw new Error('SCHEMA_MINIMUM');
    if (s.minLength !== undefined && v.length < s.minLength) throw new Error('SCHEMA_LENGTH');
    if (s.maxLength !== undefined && v.length > s.maxLength) throw new Error('SCHEMA_LENGTH');
    if (s.additionalProperties === false && Object.keys(v).some(k => !Object.hasOwn(s.properties || {}, k))) throw new Error('SCHEMA_PROPERTIES');
    if (s.pattern && typeof v === 'string' && !new RegExp(s.pattern).test(v)) throw new Error('SCHEMA_PATTERN');
    if (s.required && s.required.some(key => !Object.hasOwn(v, key))) throw new Error('SCHEMA_REQUIRED');
    if (s.properties) for (const [key, child] of Object.entries(s.properties)) if (Object.hasOwn(v, key)) check(v[key], child);
    if (s.items) for (const item of v) check(item, s.items);
  }
  check(value, schema);
  return true;
}
