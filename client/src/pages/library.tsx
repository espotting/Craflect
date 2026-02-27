import { useState } from "react";
import { DashboardLayout } from "@/components/layout";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useSources, useCreateSource, useGenerateFromSource, useGeneratedContent } from "@/hooks/use-sources";
import { Button } from "@/components/ui/button";
import { Plus, Video, FileText, Link2, Sparkles, Wand2, CheckCircle2, Loader2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { ContentSource } from "@shared/schema";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    pending: "border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/5",
    transcribed: "border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-500/5",
    analyzed: "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/5",
  };
  return (
    <Badge variant="outline" className={`rounded-full px-2 py-0 text-[10px] uppercase font-bold ${config[status] || config.pending}`} data-testid={`badge-status-${status}`}>
      <CheckCircle2 className="w-3 h-3 mr-1" />
      {status}
    </Badge>
  );
}

function SourceCardSkeleton() {
  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="w-16 h-5 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2 mb-6" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-9 rounded-lg" />
          <Skeleton className="h-9 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

function UploadDialog({ open, onOpenChange, workspaceId }: { open: boolean; onOpenChange: (open: boolean) => void; workspaceId: string }) {
  const [tab, setTab] = useState("text");
  const [title, setTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const { toast } = useToast();
  const createSource = useCreateSource(workspaceId);

  const resetForm = () => {
    setTitle("");
    setTextContent("");
    setLinkUrl("");
    setTab("text");
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({ title: "Title required", description: "Please enter a title for your source.", variant: "destructive" });
      return;
    }

    if (tab === "text" && !textContent.trim()) {
      toast({ title: "Content required", description: "Please paste your text content.", variant: "destructive" });
      return;
    }

    if (tab === "link" && !linkUrl.trim()) {
      toast({ title: "URL required", description: "Please enter a URL.", variant: "destructive" });
      return;
    }

    createSource.mutate(
      {
        title: title.trim(),
        type: tab === "text" ? "text" : "link",
        rawContent: tab === "text" ? textContent.trim() : undefined,
        fileUrl: tab === "link" ? linkUrl.trim() : undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "Source added", description: "Your content has been added to the library." });
          resetForm();
          onOpenChange(false);
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-upload-source">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add Source Content</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source-title">Title</Label>
            <Input
              id="source-title"
              placeholder="e.g. Podcast Episode 12, Blog Post Ideas..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-source-title"
            />
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="text" className="flex-1" data-testid="tab-text">
                <FileText className="w-4 h-4 mr-2" />
                Paste Text
              </TabsTrigger>
              <TabsTrigger value="link" className="flex-1" data-testid="tab-link">
                <Link2 className="w-4 h-4 mr-2" />
                URL Link
              </TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="mt-3">
              <Textarea
                placeholder="Paste your text content here — article, transcript, notes, ideas..."
                className="min-h-[160px] resize-none"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                data-testid="input-source-text"
              />
            </TabsContent>
            <TabsContent value="link" className="mt-3">
              <Input
                placeholder="https://example.com/article"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                data-testid="input-source-link"
              />
              <p className="text-xs text-muted-foreground mt-2">Paste a URL to a blog post, YouTube video, or any public web page.</p>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-upload">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createSource.isPending} data-testid="button-submit-source">
            {createSource.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Add Source
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SourceCard({ source, generatedCount, onGenerate, isGenerating }: {
  source: ContentSource;
  generatedCount: number;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const typeIcon = source.type === "video" || source.type === "audio"
    ? <Video className="w-5 h-5 text-primary" />
    : source.type === "link"
    ? <Link2 className="w-5 h-5 text-blue-500" />
    : <FileText className="w-5 h-5 text-blue-500" />;

  return (
    <Card className="border-border group" data-testid={`card-source-${source.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border border-border">
          {typeIcon}
        </div>
        <StatusBadge status={source.status} />
      </CardHeader>
      <CardContent>
        <CardTitle className="text-lg font-display text-foreground mb-1" data-testid={`text-source-title-${source.id}`}>{source.title}</CardTitle>
        <p className="text-xs text-muted-foreground mb-6" data-testid={`text-source-count-${source.id}`}>
          {generatedCount > 0 ? `${generatedCount} assets generated` : "No content generated yet"}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-lg text-xs"
            onClick={onGenerate}
            disabled={isGenerating || (!source.rawContent && !source.transcript)}
            data-testid={`button-generate-${source.id}`}
          >
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 mr-2" />}
            Generate
          </Button>
          <Button variant="outline" size="sm" className="border-border rounded-lg text-xs" disabled data-testid={`button-brief-${source.id}`}>
            <Sparkles className="w-3.5 h-3.5 mr-2" />
            Create Brief
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Library() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [generatingSourceId, setGeneratingSourceId] = useState<string | null>(null);
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const selectedWorkspace = workspaces?.[0];
  const { data: sources, isLoading: sourcesLoading } = useSources(selectedWorkspace?.id);
  const { data: generated } = useGeneratedContent(selectedWorkspace?.id);
  const generateMutation = useGenerateFromSource();
  const { toast } = useToast();

  const isLoading = workspacesLoading || sourcesLoading;

  const generatedCountBySource = (generated || []).reduce<Record<string, number>>((acc, item) => {
    if (item.sourceId) {
      acc[item.sourceId] = (acc[item.sourceId] || 0) + 1;
    }
    return acc;
  }, {});

  const handleGenerate = (source: ContentSource) => {
    if (!selectedWorkspace) return;
    setGeneratingSourceId(source.id);
    generateMutation.mutate(
      { sourceId: source.id, workspaceId: selectedWorkspace.id },
      {
        onSuccess: (data) => {
          toast({ title: "Content generated", description: `${data.length} pieces of content created from "${source.title}".` });
          setGeneratingSourceId(null);
        },
        onError: (err) => {
          toast({ title: "Generation failed", description: err.message, variant: "destructive" });
          setGeneratingSourceId(null);
        },
      }
    );
  };

  if (!workspacesLoading && !selectedWorkspace) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center p-20 rounded-md border-dashed border-2 border-border text-center" data-testid="empty-no-workspace">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Video className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-display text-2xl font-bold text-foreground mb-2">No workspace yet</h3>
          <p className="text-muted-foreground max-w-md mb-8">Create a workspace first to start uploading content.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-4xl font-bold text-foreground mb-2" data-testid="text-library-title">Content Library</h1>
            <p className="text-muted-foreground" data-testid="text-library-subtitle">
              {sources && sources.length > 0
                ? `${sources.length} source${sources.length !== 1 ? "s" : ""} in your library`
                : "Manage your source materials and transformations."}
            </p>
          </div>
          <Button onClick={() => setUploadOpen(true)} data-testid="button-upload-source">
            <Plus className="w-5 h-5 mr-2" />
            Upload Source
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SourceCardSkeleton />
            <SourceCardSkeleton />
            <SourceCardSkeleton />
          </div>
        ) : sources && sources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sources.map((source) => (
              <SourceCard
                key={source.id}
                source={source}
                generatedCount={generatedCountBySource[source.id] || 0}
                onGenerate={() => handleGenerate(source)}
                isGenerating={generatingSourceId === source.id}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-20 rounded-md border-dashed border-2 border-border text-center" data-testid="empty-no-sources">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Upload className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-display text-2xl font-bold text-foreground mb-2">Library empty</h3>
            <p className="text-muted-foreground max-w-md mb-8">Upload your first content to start generating posts automatically.</p>
            <Button onClick={() => setUploadOpen(true)} data-testid="button-upload-content-empty">
              <Plus className="w-5 h-5 mr-2" />
              Add your first source
            </Button>
          </div>
        )}
      </div>

      {selectedWorkspace && (
        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          workspaceId={selectedWorkspace.id}
        />
      )}
    </DashboardLayout>
  );
}
