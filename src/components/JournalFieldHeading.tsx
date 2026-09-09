import { useId, useState } from "react";
import { journalFieldInfo } from "../lib/journalFieldInfo";
import type { EasyScholarFieldKey } from "../lib/easyScholar";

export function JournalFieldHeading({ field, label }: { field: EasyScholarFieldKey; label: string }) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  return <div className="journal-field-heading"
    onMouseLeave={() => { setOpen(false); setDismissed(false); }}
    onKeyDown={(event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        setDismissed(true);
      }
    }}
    data-open={open}
    data-dismissed={dismissed}>
    <span className="journal-field-label">{label}</span>
    <button type="button" className="journal-field-help" aria-label={`${label}：查看简介`}
      aria-describedby={tooltipId}
      onMouseEnter={() => setDismissed(false)}
      onFocus={() => setDismissed(false)}
      onBlur={() => { setOpen(false); setDismissed(false); }}
      onClick={() => { setOpen(!open); setDismissed(open); }}>?</button>
    <div className="journal-field-tooltip" id={tooltipId} role="tooltip">
      {journalFieldInfo[field]}
      <span className="journal-field-note">数据由 easyScholar 提供；“\\”表示暂无返回数据。</span>
    </div>
  </div>;
}
