import { Lightbulb, FileText, Layers, Download, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";

type WorkflowStep = "idea" | "script" | "blueprint" | "export";

interface GuidedWorkflowProps {
  currentStep: WorkflowStep;
  onStepClick?: (step: WorkflowStep) => void;
  onNextAction?: () => void;
}

interface Step {
  id: WorkflowStep;
  label: string;
  icon: typeof Lightbulb;
  description: string;
}

export function GuidedWorkflow({ currentStep, onStepClick, onNextAction }: GuidedWorkflowProps) {
  const { t } = useLanguage();

  const steps: Step[] = [
    { id: "idea", label: t.createFlow?.step1 || "Idea", icon: Lightbulb, description: t.studio?.workflow?.ideaDesc || "Find viral opportunity" },
    { id: "script", label: t.createFlow?.step2 || "Script", icon: FileText, description: t.studio?.workflow?.scriptDesc || "Generate script" },
    { id: "blueprint", label: t.createFlow?.step3 || "Blueprint", icon: Layers, description: t.studio?.workflow?.blueprintDesc || "Plan your video" },
    { id: "export", label: t.createFlow?.step4 || "Export", icon: Download, description: t.studio?.workflow?.exportDesc || "Ready to publish" },
  ];

  const getStepIndex = (step: WorkflowStep) => steps.findIndex((s) => s.id === step);
  const currentIndex = getStepIndex(currentStep);

  const getNextActionLabel = () => {
    switch (currentStep) {
      case "idea": return t.studio?.workflow?.nextScript || "Generate Script";
      case "script": return t.studio?.workflow?.nextBlueprint || "Generate Blueprint";
      case "blueprint": return t.studio?.workflow?.nextExport || "Export Video";
      case "export": return t.studio?.workflow?.nextCreate || "Create Another";
      default: return "Continue";
    }
  };

  return (
    <div className="fixed bottom-0 left-64 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 p-4 z-50" data-testid="guided-workflow-bar">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const stepIndex = getStepIndex(step.id);
              const isActive = step.id === currentStep;
              const isCompleted = stepIndex < currentIndex;
              const isClickable = stepIndex <= currentIndex;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div
                    onClick={() => isClickable && onStepClick?.(step.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all flex-1 ${
                      isActive
                        ? "bg-purple-500/20 text-purple-300 cursor-pointer"
                        : isCompleted
                          ? "bg-green-500/20 text-green-400 cursor-pointer"
                          : isClickable
                            ? "text-slate-400 hover:text-slate-300 cursor-pointer hover:bg-slate-800/50"
                            : "text-slate-600 cursor-not-allowed"
                    }`}
                    data-testid={`workflow-step-${step.id}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isActive
                          ? "bg-purple-500 text-white"
                          : isCompleted
                            ? "bg-green-500 text-white"
                            : "bg-slate-800"
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{step.label}</p>
                      <p className="text-xs opacity-70">{step.description}</p>
                    </div>
                  </div>

                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-2 ${isCompleted ? "bg-green-500/50" : "bg-slate-800"}`} />
                  )}
                </div>
              );
            })}
          </div>

          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white ml-4"
            onClick={onNextAction}
            data-testid="button-workflow-next"
          >
            Next: {getNextActionLabel()}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
