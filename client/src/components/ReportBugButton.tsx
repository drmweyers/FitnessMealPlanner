import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import { Bug, Camera, X, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "./ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";

const bugReportSchema = z.object({
  category: z.enum(["bug", "feature", "feedback"]),
  description: z
    .string()
    .min(10, "Please provide at least 10 characters")
    .max(5000),
  screenshotBase64: z.string().optional(),
});

type BugReportFormValues = z.infer<typeof bugReportSchema>;

export function ReportBugButton() {
  const [open, setOpen] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<BugReportFormValues>({
    resolver: zodResolver(bugReportSchema),
    defaultValues: {
      category: "bug",
      description: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: BugReportFormValues) => {
      const payload = {
        ...data,
        context: {
          url: window.location.pathname,
          browser: navigator.userAgent.split(" ").pop() || "unknown",
          userAgent: navigator.userAgent,
          userRole: user?.role || "unknown",
          userId: user?.id || "unknown",
        },
      };
      const res = await fetch("/api/bugs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit report");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Report submitted",
        description: "Thank you! We'll look into it.",
      });
      setOpen(false);
      form.reset();
      setScreenshotPreview(null);
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message || "Could not submit report. Try again.",
        variant: "destructive",
      });
    },
  });

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Compress to JPEG, max ~800kb
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1200;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width *= ratio;
          height *= ratio;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL("image/jpeg", 0.6);
        form.setValue("screenshotBase64", base64);
        setScreenshotPreview(base64);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removeScreenshot = () => {
    form.setValue("screenshotBase64", undefined);
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = (data: BugReportFormValues) => {
    mutation.mutate(data);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-purple-600 px-4 py-3 text-white shadow-lg transition-all hover:bg-purple-700 hover:shadow-xl lg:rounded-md"
        aria-label="Report a Problem"
      >
        <Bug className="h-5 w-5" />
        <span className="hidden lg:inline text-sm font-medium">
          Report a Problem
        </span>
      </button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-purple-600" />
              Report a Problem
            </DialogTitle>
            <DialogDescription>
              Help us improve by reporting bugs, requesting features, or sharing
              feedback.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bug">Bug Report</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                        <SelectItem value="feedback">Feedback</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the problem, feature idea, or feedback..."
                        className="min-h-[120px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Screenshot upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Screenshot (optional)
                </label>
                {screenshotPreview ? (
                  <div className="relative inline-block">
                    <img
                      src={screenshotPreview}
                      alt="Screenshot preview"
                      className="h-24 rounded border object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeScreenshot}
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                    Attach screenshot
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshot}
                  className="hidden"
                />
              </div>

              {/* Context info */}
              <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
                We'll include: current page, browser info, and your account role
                to help diagnose the issue.
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={mutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {mutation.isPending ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Report
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
