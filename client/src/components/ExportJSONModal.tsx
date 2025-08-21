import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "../hooks/use-toast";
import { Loader2, Download, Database, Users, Calendar, CheckCircle } from "lucide-react";

interface ExportJSONModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportType = "recipes" | "users" | "mealPlans" | "all";

export default function ExportJSONModal({ isOpen, onClose }: ExportJSONModalProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<ExportType | null>(null);
  const [exportStatus, setExportStatus] = useState<Record<string, boolean>>({});

  const handleExport = async (type: ExportType) => {
    setIsExporting(true);
    setExportType(type);
    setExportStatus({});

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/export?type=${type}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const data = await response.json();
      
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fitnessmealplanner-${type}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update status
      if (type === "all") {
        setExportStatus({ recipes: true, users: true, mealPlans: true });
      } else {
        setExportStatus({ [type]: true });
      }

      toast({
        title: "Export successful",
        description: `${type === "all" ? "All data" : type} exported successfully`,
      });

      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Export Data as JSON
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isExporting}
          >
            <i className="fas fa-times"></i>
          </Button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          <p className="text-gray-600 mb-6">
            Select the data you want to export. The data will be downloaded as a JSON file.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Export Recipes */}
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${
                exportStatus.recipes ? "border-green-500 bg-green-50" : ""
              }`}
              onClick={() => !isExporting && handleExport("recipes")}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <i className="fas fa-utensils text-blue-600 text-xl"></i>
                  </div>
                  {exportStatus.recipes && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-1">Recipes</h3>
                <p className="text-sm text-gray-600">Export all recipes with nutritional data</p>
                {isExporting && exportType === "recipes" && (
                  <div className="mt-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Export Users */}
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${
                exportStatus.users ? "border-green-500 bg-green-50" : ""
              }`}
              onClick={() => !isExporting && handleExport("users")}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  {exportStatus.users && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-1">Users</h3>
                <p className="text-sm text-gray-600">Export user profiles and preferences</p>
                {isExporting && exportType === "users" && (
                  <div className="mt-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Export Meal Plans */}
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${
                exportStatus.mealPlans ? "border-green-500 bg-green-50" : ""
              }`}
              onClick={() => !isExporting && handleExport("mealPlans")}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  {exportStatus.mealPlans && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-1">Meal Plans</h3>
                <p className="text-sm text-gray-600">Export all generated meal plans</p>
                {isExporting && exportType === "mealPlans" && (
                  <div className="mt-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Export All */}
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${
                exportStatus.recipes && exportStatus.users && exportStatus.mealPlans 
                  ? "border-green-500 bg-green-50" 
                  : ""
              }`}
              onClick={() => !isExporting && handleExport("all")}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Download className="h-5 w-5 text-orange-600" />
                  </div>
                  {exportStatus.recipes && exportStatus.users && exportStatus.mealPlans && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-1">Export All</h3>
                <p className="text-sm text-gray-600">Export complete database backup</p>
                {isExporting && exportType === "all" && (
                  <div className="mt-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Note:</strong> Exported data includes all available information in JSON format. 
              Large datasets may take a moment to download.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-6 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}