'use client'

import { useToast } from '@/hooks/use-toast'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const getIcon = () => {
          if (variant === 'destructive') {
            return <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          }
          if (variant === 'success') {
            return <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          }
          return <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
        }

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-3 w-full">
              {getIcon()}
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle className="font-semibold text-sm">{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-sm opacity-90">{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
