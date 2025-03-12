"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export function TestUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const testEdgeFunction = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await fetch("/api/test-edge-function");
      const data = await response.json();

      setResult(data);

      toast({
        title: "Edge Function Test",
        description: `Status: ${data.status} (${data.ok ? "OK" : "Failed"})`,
      });
    } catch (err) {
      console.error("Error testing edge function:", err);
      setError(err instanceof Error ? err.message : "Unknown error");

      toast({
        title: "Test Failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testDirectUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file first",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      // Convert file to base64
      const base64 = await fileToBase64(file);

      // Create a simple document object
      const document = {
        title: file.name,
        fileName: file.name,
        fileContent: base64,
      };

      // Make a direct fetch request to the API
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(document),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      setResult(data);

      toast({
        title: "Upload Test",
        description: "Document uploaded successfully",
      });
    } catch (err) {
      console.error("Error testing upload:", err);
      setError(err instanceof Error ? err.message : "Unknown error");

      toast({
        title: "Upload Failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === "string") {
          // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
          const base64 = reader.result.split(",")[1];
          resolve(base64);
        } else {
          reject(new Error("Failed to convert file to base64"));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Upload Diagnostics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="test-file">Test File</Label>
          <Input
            id="test-file"
            type="file"
            onChange={handleFileChange}
            disabled={loading}
          />
          {file && (
            <p className="text-sm text-muted-foreground">
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <Button
            onClick={testEdgeFunction}
            disabled={loading}
            variant="outline"
          >
            Test Edge Function
          </Button>
          <Button onClick={testDirectUpload} disabled={loading || !file}>
            Test Direct Upload
          </Button>
        </div>

        {error && (
          <div className="p-4 mt-4 border border-red-300 bg-red-50 text-red-800 rounded-md">
            <h3 className="font-semibold">Error</h3>
            <p className="whitespace-pre-wrap">{error}</p>
          </div>
        )}

        {result && (
          <div className="p-4 mt-4 border border-gray-300 bg-gray-50 rounded-md">
            <h3 className="font-semibold">Result</h3>
            <pre className="whitespace-pre-wrap text-xs mt-2 overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
