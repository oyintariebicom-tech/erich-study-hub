import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erich/ComingSoon";

export const Route = createFileRoute("/_authenticated/app/ospe")({
  component: () => <ComingSoon title="OSPE Practical Lab" subtitle="Procedure timers & checklists" blurb="Interactive OSPE simulations — sterile dressing, catheterization, neonatal resuscitation and more — are landing in the next update." />,
});
