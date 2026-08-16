import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

interface BaseFieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>, BaseFieldProps {}
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, BaseFieldProps {}
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, BaseFieldProps {}

function FieldWrapper({
  label, hint, error, required, id, children
}: { label?: string; hint?: string; error?: string; required?: boolean; id?: string; children: ReactNode; }) {
  return (
    <label className="ui-field" htmlFor={id}>
      {label && (
        <span className="ui-field__label">
          {label}
          {required && <em className="ui-field__required">*</em>}
        </span>
      )}
      {children}
      {error && <span className="ui-field__error">{error}</span>}
      {hint && !error && <span className="ui-field__hint">{hint}</span>}
    </label>
  );
}

export function Input({ label, hint, error, required, leftIcon, rightIcon, id, className = '', ...rest }: InputProps) {
  const inputId = id || rest.name;
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required} id={inputId}>
      <div className={`ui-input-wrap${leftIcon ? ' has-left-icon' : ''}${rightIcon ? ' has-right-icon' : ''}`}>
        {leftIcon && <span className="ui-input-icon ui-input-icon--left">{leftIcon}</span>}
        <input id={inputId} className={`ui-input${error ? ' ui-input--error' : ''} ${className}`} {...rest} />
        {rightIcon && <span className="ui-input-icon ui-input-icon--right">{rightIcon}</span>}
      </div>
    </FieldWrapper>
  );
}

export function Textarea({ label, hint, error, required, id, className = '', ...rest }: TextareaProps) {
  const inputId = id || rest.name;
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required} id={inputId}>
      <textarea id={inputId} className={`ui-textarea${error ? ' ui-textarea--error' : ''} ${className}`} {...rest} />
    </FieldWrapper>
  );
}

export function Select({ label, hint, error, required, id, className = '', children, ...rest }: SelectProps) {
  const inputId = id || rest.name;
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required} id={inputId}>
      <div className="ui-select-wrap">
        <select id={inputId} className={`ui-select${error ? ' ui-select--error' : ''} ${className}`} {...rest}>
          {children}
        </select>
        <span className="ui-select__chevron" aria-hidden>▾</span>
      </div>
    </FieldWrapper>
  );
}
