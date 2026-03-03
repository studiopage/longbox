'use client';

import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FIELD_DEFINITIONS, OPERATOR_LABELS } from '@/lib/field-definitions';
import type { Condition, ConditionField, ConditionOperator } from '@/types/longbox';

interface ConditionRowProps {
  condition: Condition;
  onChange: (condition: Condition) => void;
  onRemove: () => void;
  collections?: { id: string; name: string }[];
}

const groups = ['Metadata', 'Reading', 'Library'] as const;

export function ConditionRow({ condition, onChange, onRemove, collections }: ConditionRowProps) {
  const fieldDef = FIELD_DEFINITIONS.find((f) => f.field === condition.field);
  const operators = fieldDef?.operators ?? [];

  function handleFieldChange(field: string) {
    const newFieldDef = FIELD_DEFINITIONS.find((f) => f.field === field);
    const newOperator = newFieldDef?.operators[0] ?? 'is';
    const newValue = newFieldDef?.valueType === 'boolean' ? '' : '';
    onChange({
      field: field as ConditionField,
      operator: newOperator,
      value: newValue,
    });
  }

  function handleOperatorChange(operator: string) {
    onChange({ ...condition, operator: operator as ConditionOperator });
  }

  function handleValueChange(value: string) {
    onChange({ ...condition, value });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Field selector */}
      <Select value={condition.field} onValueChange={handleFieldChange}>
        <SelectTrigger className="w-[160px] text-xs h-8 bg-[rgba(160,180,145,0.08)] border-[rgba(255,255,255,0.06)]">
          <SelectValue placeholder="Field" />
        </SelectTrigger>
        <SelectContent>
          {groups.map((group) => {
            const fields = FIELD_DEFINITIONS.filter((f) => f.group === group);
            return (
              <SelectGroup key={group}>
                <SelectLabel>{group}</SelectLabel>
                {fields.map((f) => (
                  <SelectItem key={f.field} value={f.field}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            );
          })}
        </SelectContent>
      </Select>

      {/* Operator selector */}
      <Select value={condition.operator} onValueChange={handleOperatorChange}>
        <SelectTrigger className="w-[140px] text-xs h-8 bg-[rgba(160,180,145,0.08)] border-[rgba(255,255,255,0.06)]">
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op} value={op}>
              {OPERATOR_LABELS[op] ?? op}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input (adapts by field type) */}
      {fieldDef?.valueType !== 'boolean' && (
        <ValueInput
          fieldDef={fieldDef}
          value={condition.value}
          onChange={handleValueChange}
          collections={collections}
        />
      )}

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.32)] hover:text-[#c0c8b8] transition-colors shrink-0"
        aria-label="Remove condition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function ValueInput({
  fieldDef,
  value,
  onChange,
  collections,
}: {
  fieldDef: typeof FIELD_DEFINITIONS[number] | undefined;
  value: string;
  onChange: (value: string) => void;
  collections?: { id: string; name: string }[];
}) {
  if (!fieldDef) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-[160px] h-8 text-xs bg-[rgba(160,180,145,0.08)] border-[rgba(255,255,255,0.06)]"
        placeholder="Value"
      />
    );
  }

  if (fieldDef.valueType === 'enum' && fieldDef.enumValues) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[160px] text-xs h-8 bg-[rgba(160,180,145,0.08)] border-[rgba(255,255,255,0.06)]">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {fieldDef.enumValues.map((ev) => (
            <SelectItem key={ev.value} value={ev.value}>
              {ev.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (fieldDef.valueType === 'collection') {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[160px] text-xs h-8 bg-[rgba(160,180,145,0.08)] border-[rgba(255,255,255,0.06)]">
          <SelectValue placeholder="Collection..." />
        </SelectTrigger>
        <SelectContent>
          {(collections ?? []).map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (fieldDef.valueType === 'number') {
    return (
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-[120px] h-8 text-xs bg-[rgba(160,180,145,0.08)] border-[rgba(255,255,255,0.06)]"
        placeholder="Value"
      />
    );
  }

  // Default: text input
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-[160px] h-8 text-xs bg-[rgba(160,180,145,0.08)] border-[rgba(255,255,255,0.06)]"
      placeholder="Value"
    />
  );
}
