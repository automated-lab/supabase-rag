"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Save } from "lucide-react"
import { updateRagSettings } from "@/lib/actions/admin"
import type { RagSettings } from "@/lib/actions/admin"

interface SettingsFormProps {
  initialSettings: RagSettings
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // Initialize the form with the initial settings
  const form = useForm({
    defaultValues: initialSettings,
  })

  // Handle form submission
  const onSubmit = async (values: RagSettings) => {
    try {
      setIsSubmitting(true)

      // Ensure chunk_overlap is less than chunk_size
      if (values.chunk_overlap >= values.chunk_size) {
        form.setError("chunk_overlap", {
          type: "manual",
          message: "Overlap must be less than chunk size",
        })
        return
      }

      // Update settings
      await updateRagSettings(values)

      toast({
        title: "Settings updated",
        description: "The RAG system settings have been updated successfully.",
      })
    } catch (error) {
      console.error("Error updating settings:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update settings",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue="models">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="models">AI Models</TabsTrigger>
            <TabsTrigger value="search">Vector Search</TabsTrigger>
            <TabsTrigger value="processing">Document Processing</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="models">
              <Card>
                <CardHeader>
                  <CardTitle>AI Model Settings</CardTitle>
                  <CardDescription>
                    Configure which AI models are used for generating responses and embeddings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="openai_model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>OpenAI Model</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="gpt-4o">GPT-4o (Recommended)</SelectItem>
                            <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>The model used to generate responses to user queries</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="embedding_model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Embedding Model</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an embedding model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="text-embedding-3-small">text-embedding-3-small (Recommended)</SelectItem>
                            <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
                            <SelectItem value="text-embedding-ada-002">text-embedding-ada-002 (Legacy)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The model used to generate vector embeddings for documents and queries
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="system_prompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>System Prompt</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter system prompt"
                            className="min-h-[150px]"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormDescription>The system prompt that guides how the AI responds to queries</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="search">
              <Card>
                <CardHeader>
                  <CardTitle>Vector Search Settings</CardTitle>
                  <CardDescription>Configure how the system searches for relevant document chunks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="match_threshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Match Threshold: {field.value.toFixed(2)}</FormLabel>
                        <FormControl>
                          <Slider
                            min={0}
                            max={1}
                            step={0.01}
                            value={[field.value]}
                            onValueChange={(values) => field.onChange(values[0])}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormDescription>
                          Minimum similarity score (0-1) required for a document chunk to be considered relevant. Higher
                          values mean more strict matching.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="match_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Match Count</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={20}
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum number of document chunks to retrieve for each query (1-20)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="processing">
              <Card>
                <CardHeader>
                  <CardTitle>Document Processing Settings</CardTitle>
                  <CardDescription>Configure how documents are chunked and processed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="chunk_size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chunk Size</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={100}
                            max={5000}
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormDescription>
                          The maximum size (in characters) of each document chunk (100-5000)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="chunk_overlap"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chunk Overlap</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={form.watch("chunk_size") - 1}
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormDescription>
                          The number of characters to overlap between chunks (0-{form.watch("chunk_size") - 1})
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          <CardFooter className="flex justify-end pt-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </CardFooter>
        </Tabs>
      </form>
    </Form>
  )
}

