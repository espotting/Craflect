import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { Video, Lock } from "lucide-react";

export default function VideoBuilder() {
  const { t } = useLanguage();

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4" data-testid="page-video-builder">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <Video className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="text-video-builder-title">
          {t.videoBuilder.title}
        </h1>
        <p className="text-muted-foreground max-w-md mb-6" data-testid="text-video-builder-description">
          {t.videoBuilder.description}
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium">
          <Lock className="w-4 h-4" />
          {t.videoBuilder.comingSoon}
        </div>
      </div>
    </DashboardLayout>
  );
}
