import { Status } from "@/lib/types";
import { STATUS_COLORS } from "@/lib/ui";

export default function StatusBadge({ status }: { status: Status }) {
  const colors = STATUS_COLORS[status] ?? { bg: "#eef0f4", fg: "#475467" };
  return (
    <span className="badge" style={{ background: colors.bg, color: colors.fg }}>
      {status}
    </span>
  );
}
