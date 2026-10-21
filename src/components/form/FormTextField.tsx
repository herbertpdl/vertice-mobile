import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";

import { TextField, type TextFieldProps } from "@/components/ui/TextField";

export type FormTextFieldProps<T extends FieldValues> = Omit<
  TextFieldProps,
  "value" | "onChangeText" | "onBlur" | "error"
> & {
  control: Control<T>;
  name: FieldPath<T>;
  /** Reformats as the user types (the CPF mask). */
  format?: (text: string) => string;
};

/**
 * A `TextField` bound to a react-hook-form field: value, change, blur and the field's error
 * message (the Zod schema's pt-BR copy). Use it in every form so wiring stays identical.
 */
export function FormTextField<T extends FieldValues>({ control, name, format, ...field }: FormTextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur, ref }, fieldState: { error } }) => (
        <TextField
          {...field}
          ref={ref}
          value={(value as string | undefined) ?? ""}
          onChangeText={(text) => onChange(format === undefined ? text : format(text))}
          onBlur={onBlur}
          error={error?.message}
        />
      )}
    />
  );
}
