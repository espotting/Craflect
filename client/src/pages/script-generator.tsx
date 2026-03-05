import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { FileText, Lock, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ScriptGenerator() {
  const { t } = useLanguage();

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4" data-testid="page-script-generator">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="text-script-generator-title">
          {t.scriptGenerator.title}
        </h1>
        <p className="text-muted-foreground max-w-md mb-8" data-testid="text-script-generator-description">
          {t.scriptGenerator.description}
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium mb-6">
          <Lock className="w-4 h-4" />
          {t.scriptGenerator.comingSoon}
        </div>

        <Button
          variant="outline"
          disabled
          className="gap-2 opacity-50 cursor-not-allowed"
          data-testid="button-generate-video-structure"
        >
          <Video className="w-4 h-4" />
          {t.scriptGenerator.generateVideoStructure}
        </Button>
      </div>
    </DashboardLayout>
  );
}
