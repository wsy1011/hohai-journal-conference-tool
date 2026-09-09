type Props = { open: boolean; value: string; onChange: (value: string) => void; onSave: () => void; onClear: () => void; onClose: () => void };

export function SettingsDialog({ open, value, onChange, onSave, onClear, onClose }: Props) {
  if (!open) return null;
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div className="drawer-header"><div><span className="eyebrow">连接设置</span><h2 id="settings-title">EasyScholar</h2></div><button className="close-button" onClick={onClose} aria-label="关闭设置">×</button></div><p className="dialog-copy">SecretKey 用于查询期刊的 SCI、SSCI 和中国科技核心等信息。当前值仅保存在此浏览器中。</p><label className="field-label">SecretKey<input className="secret-input" type="password" value={value} onChange={(event) => onChange(event.target.value)} autoFocus /></label><div className="dialog-actions"><button className="secondary-button" onClick={onClear}>清除本地 Key</button><button className="primary-button" onClick={onSave}>保存设置</button></div></section></div>;
}
