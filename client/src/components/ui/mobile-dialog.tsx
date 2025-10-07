import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

const MobileDialog = DialogPrimitive.Root
const MobileDialogTrigger = DialogPrimitive.Trigger
const MobileDialogPortal = DialogPrimitive.Portal
const MobileDialogClose = DialogPrimitive.Close

const MobileDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
MobileDialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const MobileDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <MobileDialogPortal>
    <MobileDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      data-mobile-dialog="true"
      className={cn(
        // Base styles
        "fixed z-50 gap-4 bg-white p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
        // Mobile-first positioning - PROPERLY CENTERED on mobile
        "left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%]",
        // Size constraints
        "w-[calc(100vw-2rem)] max-w-lg",
        "sm:w-full sm:max-w-lg",
        "max-h-[calc(100vh-2rem)]",
        "sm:max-h-[85vh]",
        // Rounded corners
        "rounded-lg",
        // Overflow handling
        "overflow-y-auto",
        // Animation classes
        "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
        "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-slate-100 data-[state=open]:text-slate-500">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </MobileDialogPortal>
))
MobileDialogContent.displayName = DialogPrimitive.Content.displayName

const MobileDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
MobileDialogHeader.displayName = "MobileDialogHeader"

const MobileDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
MobileDialogFooter.displayName = "MobileDialogFooter"

const MobileDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
MobileDialogTitle.displayName = DialogPrimitive.Title.displayName

const MobileDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-slate-500", className)}
    {...props}
  />
))
MobileDialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  MobileDialog,
  MobileDialogPortal,
  MobileDialogOverlay,
  MobileDialogClose,
  MobileDialogTrigger,
  MobileDialogContent,
  MobileDialogHeader,
  MobileDialogFooter,
  MobileDialogTitle,
  MobileDialogDescription,
}