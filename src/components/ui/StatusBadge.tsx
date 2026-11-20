interface BadgeProps {
  status: "Completed" | "Pending" | "In Progress";
}

const styles: Record<BadgeProps["status"], string> = {
  Completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
};

export default function StatusBadge({ status }: BadgeProps) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

