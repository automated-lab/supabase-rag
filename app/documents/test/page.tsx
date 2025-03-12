import { TestUpload } from "@/components/documents/test-upload";

export default function TestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Document Upload Diagnostics</h1>
      <p className="mb-6 text-muted-foreground">
        Test and diagnose any issues.
      </p>
      <TestUpload />
    </div>
  );
}
