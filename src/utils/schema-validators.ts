import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import sectionSchema from '../../schemas/section.schema.json';
import patchSchema from '../../schemas/section.patch.schema.json';
import type { SectionPatchResponse, SectionResponse } from '../types/section';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validateSection = ajv.compile(sectionSchema);
const validatePatch = ajv.compile(patchSchema);

function formatErrors(errors: ErrorObject[] | null | undefined): string {
  if (!errors) {
    return 'Unknown validation error';
  }
  return errors
    .map((err) => {
      const path = err.instancePath || '(root)';
      return `${path} ${err.message ?? ''}`.trim();
    })
    .join('\n');
}

export function parseSectionResponse(data: unknown): SectionResponse {
  if (validateSection(data)) {
    return data as SectionResponse;
  }
  throw new Error(`Section schema validation failed:\n${formatErrors(validateSection.errors)}`);
}

export function parsePatchResponse(data: unknown): SectionPatchResponse {
  if (validatePatch(data)) {
    return data as SectionPatchResponse;
  }
  throw new Error(`Patch schema validation failed:\n${formatErrors(validatePatch.errors)}`);
}
