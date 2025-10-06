"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Props = {
  label?: string
  value: string
  onChangeText: (text: string) => void
  required?: boolean
  submitAttempted?: boolean
  errorText?: string
  onErrorChange?: (hasError: boolean) => void
  placeholder?: string
  type?: string
}

export default function RequiredTextInput({
  label,
  value,
  onChangeText,
  required = true,
  submitAttempted = false,
  errorText,
  onErrorChange,
  placeholder,
  type = "text",
}: Props) {
  const [error, setError] = useState<string | null>(null)

  const validate = (val: string) => {
    const hasError = required && val.trim().length === 0
    setError(hasError ? (errorText ?? "Este campo es obligatorio") : null)
    onErrorChange?.(hasError)
    return !hasError
  }

  useEffect(() => {
    if (submitAttempted) validate(value)
  }, [submitAttempted])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    if (error && text.trim().length > 0) {
      setError(null)
      onErrorChange?.(false)
    }
    onChangeText(text)
  }

  const handleBlur = () => {
    validate(value)
  }

  return (
    <div className="mb-4">
      {label && (
        <Label className="text-gray-700 font-medium mb-2 block">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}

      <Input
        type={type}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`bg-white p-4 rounded-xl border ${error ? "border-red-500" : "border-gray-200"}`}
      />

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  )
}
