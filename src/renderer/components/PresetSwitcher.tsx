import { useState, useEffect, useRef } from 'react';

interface PresetInfo {
  name: string;
  description: string;
  models: Record<string, string>;
}

interface PresetSwitcherProps {
  onPresetChange?: (presetName: string) => void;
}

const PRESET_ICONS: Record<string, string> = {
  speed: '⚡',
  balanced: '⚖️',
  performance: '🚀',
  budget: '💰',
};

export function PresetSwitcher({ onPresetChange }: PresetSwitcherProps) {
  const [presets, setPresets] = useState<PresetInfo[]>([]);
  const [activePreset, setActivePreset] = useState('speed');
  const [menuOpen, setMenuOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load presets on mount
  useEffect(() => {
    window.electronAPI?.getAiPresets?.().then((result) => {
      if (result.success && result.presets) {
        setPresets(result.presets);
        if (result.activePreset) setActivePreset(result.activePreset);
      }
    });
  }, []);

  // Close menus on outside click
  useEffect(() => {
    if (!menuOpen && !editorOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setEditorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen, editorOpen]);

  const handleSelect = async (name: string) => {
    const result = await window.electronAPI?.setAiPreset?.(name);
    if (result?.success) {
      setActivePreset(name);
      onPresetChange?.(name);
    }
    setMenuOpen(false);
  };

  const current = presets.find((p) => p.name === activePreset);
  const icon = PRESET_ICONS[activePreset] || '⚙️';

  // Shorten model IDs for display (e.g. "openai/gpt-4o-2024-11-20" → "gpt-4o")
  const shortenModel = (id: string) => {
    const parts = id.split('/');
    const model = parts[parts.length - 1];
    // Strip date suffixes like -2024-11-20
    return model.replace(/-\d{4}-\d{2}-\d{2}$/, '').replace(/-preview.*$/, '');
  };

  const TASK_LABELS: Record<string, string> = {
    commandHelper: 'Commands',
    codeExplainer: 'Code',
    generalAssistant: 'Chat',
    errorAnalyzer: 'Errors',
  };

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
      {/* Preset name button */}
      <button
        onClick={() => { setMenuOpen(!menuOpen); setEditorOpen(false); }}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          padding: '0 4px',
          fontSize: '12px',
          opacity: 0.9,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
        title={current?.description || 'Switch preset'}
      >
        <span>{icon}</span>
        <span style={{ textTransform: 'capitalize' }}>{activePreset}</span>
      </button>

      {/* Gear button for editor */}
      <button
        onClick={() => { setEditorOpen(!editorOpen); setMenuOpen(false); }}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          padding: '0 2px',
          fontSize: '10px',
          opacity: 0.5,
        }}
        title="View preset models"
      >
        ⚙
      </button>

      {/* Drop-up preset selector */}
      {menuOpen && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          marginBottom: '6px',
          background: 'rgba(20, 20, 30, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '8px',
          padding: '4px',
          minWidth: '200px',
          zIndex: 9999,
          boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.4)',
        }}>
          {presets.map((p) => (
            <button
              key={p.name}
              onClick={() => handleSelect(p.name)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '8px 10px',
                background: p.name === activePreset ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '14px' }}>{PRESET_ICONS[p.name] || '⚙️'}</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: p.name === activePreset ? 700 : 500,
                  textTransform: 'capitalize',
                }}>
                  {p.name}
                </div>
                <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '1px' }}>
                  {p.description}
                </div>
              </div>
              {p.name === activePreset && (
                <span style={{ color: 'rgba(99, 102, 241, 0.9)', fontSize: '10px' }}>●</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Drop-up preset model editor/viewer */}
      {editorOpen && current && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          marginBottom: '6px',
          background: 'rgba(20, 20, 30, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '8px',
          padding: '12px',
          minWidth: '260px',
          zIndex: 9999,
          boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.4)',
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: '8px',
          }}>
            {icon} {current.name} preset
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {Object.entries(current.models).map(([task, modelId]) => (
              <div key={task} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                  {TASK_LABELS[task] || task}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: 'rgba(99, 102, 241, 0.9)',
                  fontWeight: 500,
                }}>
                  {shortenModel(modelId)}
                </span>
              </div>
            ))}
          </div>
          <div style={{
            fontSize: '10px',
            opacity: 0.4,
            marginTop: '8px',
            textAlign: 'center',
          }}>
            {current.description}
          </div>
        </div>
      )}
    </div>
  );
}
