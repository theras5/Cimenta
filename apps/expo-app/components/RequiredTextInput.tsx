import React, { useEffect, useState } from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";

type Props = Omit<TextInputProps, "onChangeText"> & {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  required?: boolean;
  submitAttempted?: boolean;
  errorText?: string;
  onErrorChange?: (hasError: boolean) => void;
};

export default function RequiredTextInput({
  label,
  value,
  onChangeText,
  required = true,
  submitAttempted = false,
  errorText,
  onErrorChange,
  placeholder,
  ...rest
}: Props) {
  const [error, setError] = useState<string | null>(null);

  const validate = (val: string) => {
    const hasError = required && val.trim().length === 0;
    setError(hasError ? errorText ?? "Este campo es obligatorio" : null);
    onErrorChange?.(hasError);
    return !hasError;
  };

  useEffect(() => {
    if (submitAttempted) validate(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitAttempted]);

  const handleChange = (text: string) => {
    if (error && text.trim().length > 0) {
      setError(null);
      onErrorChange?.(false);
    }
    onChangeText(text);
  };

  return (
    <View className="mb-4">
      {label ? (
        <Text className="text-gray-700 font-medium mb-2">
          {label} {required && <Text className="text-red-500">*</Text>}
        </Text>
      ) : null}

      <TextInput
        value={value}
        onChangeText={handleChange}
        onBlur={() => validate(value)}
        placeholder={placeholder}
        className={`bg-white p-4 rounded-xl border ${
          error ? "border-red-500" : "border-gray-200"
        }`}
        {...rest}
      />

      {error && <Text className="text-red-500 text-sm mt-1">{error}</Text>}
    </View>
  );
}