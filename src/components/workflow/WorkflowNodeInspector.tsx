import React, { useMemo } from 'react';
import { 
  X, 
  Trash2, 
  Copy, 
  Send, 
  Clock, 
  GitBranch, 
  CheckSquare, 
  Sparkles, 
  Mail, 
  Calendar, 
  UserCheck, 
  Linkedin, 
  Phone, 
  Info,
  GitMerge
} from 'lucide-react';
import { 
  WorkflowNodeItem, 
  WorkflowNodeData, 
  StageTemplate, 
  ConnectedSender 
} from '../../types';

interface WorkflowNodeInspectorProps {
  node: WorkflowNodeItem;
  templates: StageTemplate[];
  senders: ConnectedSender[];
  onUpdateNodeData: (nodeId: string, updatedData: Partial<WorkflowNodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onClose: () => void;
}

export const WorkflowNodeInspector: React.FC<WorkflowNodeInspectorProps> = ({
  node,
  templates,
  senders,
  onUpdateNodeData,
  onDeleteNode,
  onDuplicateNode,
  onClose
}) => {
  const { data } = node;
  const nodeType = data.nodeType;

  // Resolve current sender ID reliably matching senders list
  const currentSenderId = useMemo(() => {
    if (data.senderId && senders.some(s => s.id === data.senderId)) {
      return data.senderId;
    }
    if (data.senderEmail) {
      const match = senders.find(s => s.email.toLowerCase() === data.senderEmail?.toLowerCase());
      if (match) return match.id;
    }
    if (data.senderId) return data.senderId;
    return '';
  }, [data.senderId, data.senderEmail, senders]);

  const startSenderId = useMemo(() => {
    if (data.senderId && senders.some(s => s.id === data.senderId)) {
      return data.senderId;
    }
    if (data.senderEmail) {
      const match = senders.find(s => s.email.toLowerCase() === data.senderEmail?.toLowerCase());
      if (match) return match.id;
    }
    return senders[0]?.id || data.senderId || 'sender-primary';
  }, [data.senderId, data.senderEmail, senders]);

  const insertMergeTag = (tag: string, field: 'customSubject' | 'customBody') => {
    const currentVal = data[field] || '';
    onUpdateNodeData(node.id, {
      [field]: currentVal + `{{${tag}}}`
    });
  };

  return (
    <div 
      className="nowheel nodrag w-80 sm:w-96 bg-white border-l border-slate-200 h-full flex flex-col shadow-xl z-20 animate-in slide-in-from-right duration-200 select-text"
      onWheel={(e) => e.stopPropagation()}
    >
      
      {/* Inspector Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold">
            {nodeType === 'start' && <Sparkles className="w-4 h-4" />}
            {nodeType === 'email' && <Mail className="w-4 h-4" />}
            {nodeType === 'wait' && <Clock className="w-4 h-4" />}
            {nodeType === 'condition' && <GitBranch className="w-4 h-4" />}
            {nodeType === 'manual_task' && <Phone className="w-4 h-4" />}
            {nodeType === 'linkedin_invite' && <Linkedin className="w-4 h-4" />}
            {nodeType === 'linkedin_message' && <Linkedin className="w-4 h-4" />}
            {nodeType === 'merge' && <GitMerge className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 capitalize">
              {nodeType.replace('_', ' ')} Node Settings
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">ID: {node.id}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Inspector Body */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 text-xs">
        
        {/* Node Label */}
        <div className="space-y-1">
          <label className="font-bold text-slate-700">Node Step Label</label>
          <input
            type="text"
            value={data.label || ''}
            onChange={(e) => onUpdateNodeData(node.id, { label: e.target.value })}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-red-500 font-medium"
            placeholder="e.g. Initial Cold Outreach"
          />
        </div>

        {/* Node Description */}
        <div className="space-y-1">
          <label className="font-bold text-slate-700">Internal Description / Purpose</label>
          <textarea
            value={data.description || ''}
            onChange={(e) => onUpdateNodeData(node.id, { description: e.target.value })}
            rows={2}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-red-500 text-xs"
            placeholder="Briefly describe what this step does in the campaign flow..."
          />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* START NODE SPECIFIC SETTINGS                                       */}
        {/* ------------------------------------------------------------------ */}
        {nodeType === 'start' && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-red-600" />
                  <span>Sender Account</span>
                </label>
                {senders.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    {senders.length} connected
                  </span>
                )}
              </div>
              <select
                id={`start-sender-select-${node.id}`}
                value={startSenderId}
                onChange={(e) => {
                  const chosenVal = e.target.value;
                  const chosen = senders.find(s => s.id === chosenVal || s.email === chosenVal);
                  onUpdateNodeData(node.id, {
                    senderId: chosen ? chosen.id : chosenVal,
                    senderEmail: chosen ? chosen.email : (chosenVal === 'custom' ? (data.senderEmail || '') : chosenVal)
                  });
                }}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-red-500 font-semibold cursor-pointer bg-white"
              >
                {senders.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.email}) {s.isPrimary ? '• Primary' : ''}
                  </option>
                ))}
                <option value="custom">Custom / Specific Email Address...</option>
                {startSenderId && !senders.some(s => s.id === startSenderId) && startSenderId !== 'custom' && (
                  <option value={startSenderId}>
                    {data.senderEmail || startSenderId} (Configured Account)
                  </option>
                )}
              </select>

              {/* Editable Sender Email Address Field */}
              <div className="pt-1 space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 flex items-center justify-between">
                  <span>Sender Email Address</span>
                  <span className="text-red-600 text-[10px] font-medium">Editable</span>
                </label>
                <input
                  type="email"
                  value={data.senderEmail || (senders.find(s => s.id === startSenderId)?.email) || ''}
                  onChange={(e) => {
                    const newEmail = e.target.value;
                    const matched = senders.find(s => s.email.toLowerCase() === newEmail.toLowerCase());
                    onUpdateNodeData(node.id, {
                      senderEmail: newEmail,
                      senderId: matched ? matched.id : 'custom'
                    });
                  }}
                  placeholder="e.g. sender@company.com"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-red-500 font-mono text-xs bg-white text-slate-800"
                  title="Modify the sender email address used for this workflow"
                />
              </div>

              <p className="text-[10px] text-slate-400">
                All emails generated in this workflow will be dispatched through this email sender.
              </p>
            </div>

            {/* Allowed Sending Windows */}
            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-600" />
                <span>Allowed Sending Schedule</span>
              </label>

              {/* Days checkboxes */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">Active Sending Days:</span>
                <div className="grid grid-cols-7 gap-1">
                  {[
                    { day: 1, label: 'M' },
                    { day: 2, label: 'T' },
                    { day: 3, label: 'W' },
                    { day: 4, label: 'T' },
                    { day: 5, label: 'F' },
                    { day: 6, label: 'S' },
                    { day: 0, label: 'S' }
                  ].map(({ day, label }) => {
                    const schedule = data.schedule || { allowedDays: [1, 2, 3, 4, 5], startHour: 9, endHour: 18, timezone: 'local' };
                    const isChecked = schedule.allowedDays?.includes(day);

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const currentDays = schedule.allowedDays || [1, 2, 3, 4, 5];
                          const newDays = isChecked
                            ? currentDays.filter(d => d !== day)
                            : [...currentDays, day];
                          onUpdateNodeData(node.id, {
                            schedule: { ...schedule, allowedDays: newDays }
                          });
                        }}
                        className={`py-1 text-center font-bold text-xs rounded border transition-all ${
                          isChecked 
                            ? 'bg-red-600 text-white border-red-700 shadow-2xs' 
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hours */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Start Hour:</span>
                  <select
                    value={data.schedule?.startHour !== undefined ? data.schedule.startHour : 9}
                    onChange={(e) => {
                      const schedule = data.schedule || { allowedDays: [1, 2, 3, 4, 5], startHour: 9, endHour: 18, timezone: 'local' };
                      onUpdateNodeData(node.id, {
                        schedule: { ...schedule, startHour: parseInt(e.target.value) }
                      });
                    }}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                  >
                    {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map(h => (
                      <option key={h} value={h}>
                        {h > 12 ? h - 12 : h === 0 ? 12 : h}:00 {h >= 12 ? 'PM' : 'AM'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">End Hour:</span>
                  <select
                    value={data.schedule?.endHour !== undefined ? data.schedule.endHour : 18}
                    onChange={(e) => {
                      const schedule = data.schedule || { allowedDays: [1, 2, 3, 4, 5], startHour: 9, endHour: 18, timezone: 'local' };
                      onUpdateNodeData(node.id, {
                        schedule: { ...schedule, endHour: parseInt(e.target.value) }
                      });
                    }}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                  >
                    {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map(h => (
                      <option key={h} value={h}>
                        {h > 12 ? h - 12 : h === 0 ? 12 : h}:00 {h >= 12 ? 'PM' : 'AM'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Timezone */}
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Timezone:</span>
                <select
                  value={data.schedule?.timezone || 'local'}
                  onChange={(e) => {
                    const schedule = data.schedule || { allowedDays: [1, 2, 3, 4, 5], startHour: 9, endHour: 18, timezone: 'local' };
                    onUpdateNodeData(node.id, {
                      schedule: { ...schedule, timezone: e.target.value }
                    });
                  }}
                  className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                >
                  <option value="local">Local Browser Time ({Intl.DateTimeFormat().resolvedOptions().timeZone})</option>
                  <option value="America/New_York">US Eastern (ET)</option>
                  <option value="America/Chicago">US Central (CT)</option>
                  <option value="America/Denver">US Mountain (MT)</option>
                  <option value="America/Los_Angeles">US Pacific (PT)</option>
                  <option value="UTC">UTC Universal</option>
                  <option value="Europe/London">London / GMT</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* EMAIL NODE SPECIFIC SETTINGS                                       */}
        {/* ------------------------------------------------------------------ */}
        {nodeType === 'email' && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            {/* Template Source Selection */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name={`email-source-${node.id}`}
                  checked={!data.useCustomTemplate}
                  onChange={() => onUpdateNodeData(node.id, { useCustomTemplate: false })}
                  className="text-red-600 focus:ring-red-500"
                />
                <span className="font-bold text-slate-700">7-Stage Sequence Template</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name={`email-source-${node.id}`}
                  checked={Boolean(data.useCustomTemplate)}
                  onChange={() => {
                    const tmpl = templates.find(t => t.stage === (data.templateStage || 1));
                    onUpdateNodeData(node.id, { 
                      useCustomTemplate: true,
                      customSubject: data.customSubject || tmpl?.subject || '',
                      customBody: data.customBody || tmpl?.body || tmpl?.bodyHtml || ''
                    });
                  }}
                  className="text-red-600 focus:ring-red-500"
                />
                <span className="font-bold text-slate-700">Custom Template</span>
              </label>
            </div>

            {!data.useCustomTemplate ? (
              <div className="space-y-3">
                {/* 2-Column Selection: Stage of Email Column & Sender Account Column */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {/* Column 1: Stage of Email */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block text-[11px]">Stage of Email</label>
                    <select
                      value={data.templateStage || 1}
                      onChange={(e) => {
                        const st = parseInt(e.target.value);
                        const tmpl = templates.find(t => t.stage === st);
                        onUpdateNodeData(node.id, {
                          templateStage: st,
                          label: `Email Stage ${st}: ${tmpl?.name || 'Email'}`
                        });
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-red-500 font-semibold bg-white text-xs"
                    >
                      {templates.map(t => (
                        <option key={t.stage} value={t.stage}>
                          Stage {t.stage}: {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Column 2: Send From Dropdown & Editable Email */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block text-[11px] flex items-center justify-between">
                      <span>Send From</span>
                      <span className="text-[10px] text-red-600 font-normal">Editable</span>
                    </label>
                    <select
                      id={`email-sender-select-${node.id}`}
                      value={currentSenderId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          onUpdateNodeData(node.id, {
                            senderId: '',
                            senderEmail: ''
                          });
                          return;
                        }
                        const chosenSender = senders.find(s => s.id === val || s.email === val);
                        onUpdateNodeData(node.id, {
                          senderId: chosenSender ? chosenSender.id : val,
                          senderEmail: chosenSender ? chosenSender.email : (val.includes('@') ? val : (data.senderEmail || ''))
                        });
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-red-500 font-semibold bg-white text-xs cursor-pointer"
                      title="Select connected Gmail account for this specific email stage"
                    >
                      <option value="">Campaign Default Inbox</option>
                      {senders.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.email}) {s.isPrimary ? '• Primary' : ''}
                        </option>
                      ))}
                      <option value="custom">Custom Email Address...</option>
                      {currentSenderId && !senders.some(s => s.id === currentSenderId) && currentSenderId !== 'custom' && (
                        <option value={currentSenderId}>
                          {data.senderEmail || currentSenderId} (Connected Account)
                        </option>
                      )}
                    </select>

                    <input
                      type="email"
                      value={data.senderEmail || ''}
                      onChange={(e) => {
                        const newEmail = e.target.value;
                        const matched = senders.find(s => s.email.toLowerCase() === newEmail.toLowerCase());
                        onUpdateNodeData(node.id, {
                          senderEmail: newEmail,
                          senderId: matched ? matched.id : (newEmail ? 'custom' : '')
                        });
                      }}
                      placeholder="e.g. rep@company.com"
                      className="w-full px-2 py-1 border border-slate-300 rounded text-[11px] font-mono bg-white mt-1"
                      title="Sender email address for this stage"
                    />
                  </div>
                </div>

                {/* Preview of chosen stage subject */}
                {(() => {
                  const tmpl = templates.find(t => t.stage === (data.templateStage || 1));
                  const assignedSender = senders.find(s => s.id === currentSenderId || (data.senderEmail && s.email === data.senderEmail));
                  return tmpl ? (
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1 text-slate-600">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                        <span className="text-red-800 font-semibold">Stage {tmpl.stage}: {tmpl.name}</span>
                        <span className="text-slate-600 font-medium">Sender: <strong>{assignedSender ? `${assignedSender.name} (${assignedSender.email})` : (data.senderEmail || 'Campaign Default')}</strong></span>
                      </div>
                      <p><strong>Subject:</strong> {tmpl.subject}</p>
                      <p className="line-clamp-2 text-slate-500"><strong>Body:</strong> {tmpl.bodyHtml.replace(/<[^>]*>?/gm, '')}</p>
                    </div>
                  ) : null;
                })()}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <label className="font-bold text-slate-700 block text-[11px] flex items-center justify-between">
                    <span>Sender Account</span>
                    <span className="text-[10px] text-red-600 font-normal">Editable</span>
                  </label>
                  <select
                    id={`custom-template-sender-select-${node.id}`}
                    value={currentSenderId}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        onUpdateNodeData(node.id, {
                          senderId: '',
                          senderEmail: ''
                        });
                        return;
                      }
                      const chosenSender = senders.find(s => s.id === val || s.email === val);
                      onUpdateNodeData(node.id, {
                        senderId: chosenSender ? chosenSender.id : val,
                        senderEmail: chosenSender ? chosenSender.email : (val.includes('@') ? val : (data.senderEmail || ''))
                      });
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-red-500 font-semibold bg-white text-xs cursor-pointer"
                  >
                    <option value="">Campaign Default Sender</option>
                    {senders.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.email}) {s.isPrimary ? '• Primary' : ''}
                      </option>
                    ))}
                    <option value="custom">Custom Email Address...</option>
                    {currentSenderId && !senders.some(s => s.id === currentSenderId) && currentSenderId !== 'custom' && (
                      <option value={currentSenderId}>
                        {data.senderEmail || currentSenderId} (Connected Account)
                      </option>
                    )}
                  </select>

                  <input
                    type="email"
                    value={data.senderEmail || ''}
                    onChange={(e) => {
                      const newEmail = e.target.value;
                      const matched = senders.find(s => s.email.toLowerCase() === newEmail.toLowerCase());
                      onUpdateNodeData(node.id, {
                        senderEmail: newEmail,
                        senderId: matched ? matched.id : (newEmail ? 'custom' : '')
                      });
                    }}
                    placeholder="e.g. rep@company.com"
                    className="w-full px-2 py-1 border border-slate-300 rounded text-[11px] font-mono bg-white mt-1"
                    title="Sender email address for this custom template"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Custom Subject Line</label>
                  <input
                    type="text"
                    value={data.customSubject || ''}
                    onChange={(e) => onUpdateNodeData(node.id, { customSubject: e.target.value })}
                    placeholder="e.g. Quick question on {{pain_point}}"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-red-500 text-xs"
                  />
                  {/* Merge Tags Helper for Subject */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {['first_name', 'company', 'pain_point'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => insertMergeTag(t, 'customSubject')}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-red-50 text-[10px] font-mono text-slate-700 rounded border border-slate-200"
                      >
                        +{`{{${t}}}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Custom Email Body (HTML / Text)</label>
                  <textarea
                    rows={6}
                    value={data.customBody || ''}
                    onChange={(e) => onUpdateNodeData(node.id, { customBody: e.target.value })}
                    placeholder="Hi {{first_name}},&#10;&#10;Noticed your work at {{company}}..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-red-500 text-xs font-mono"
                  />
                  <div className="flex flex-wrap gap-1">
                    {['first_name', 'last_name', 'company', 'pain_point', 'job_title', 'industry', 'sender_name'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => insertMergeTag(t, 'customBody')}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-red-50 text-[10px] font-mono text-slate-700 rounded border border-slate-200"
                      >
                        +{`{{${t}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* WAIT NODE SPECIFIC SETTINGS                                        */}
        {/* ------------------------------------------------------------------ */}
        {nodeType === 'wait' && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Wait Duration</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-1">Duration:</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={data.waitDuration !== undefined ? data.waitDuration : 1}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const dur = raw === '' ? 1 : Math.max(1, parseInt(raw, 10) || 1);
                    onUpdateNodeData(node.id, {
                      waitDuration: dur,
                      label: `Wait ${dur} ${data.waitUnit || 'days'}`
                    });
                  }}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 text-sm font-bold"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-1">Unit:</span>
                <select
                  value={data.waitUnit || 'days'}
                  onChange={(e) => {
                    const u = e.target.value as 'days' | 'hours';
                    onUpdateNodeData(node.id, {
                      waitUnit: u,
                      label: `Wait ${data.waitDuration || 1} ${u}`
                    });
                  }}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="days">Business Days</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 bg-amber-50 p-2 rounded-lg border border-amber-200">
              Leads entering this node will pause for the specified delay before proceeding to the next connected step.
            </p>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* CONDITION NODE SPECIFIC SETTINGS                                   */}
        {/* ------------------------------------------------------------------ */}
        {nodeType === 'condition' && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="font-bold text-slate-700 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-purple-600" />
              <span>Branch Evaluation Rule</span>
            </label>

            <select
              value={data.conditionType || 'email_opened'}
              onChange={(e) => {
                const c = e.target.value as any;
                let lbl = 'Condition Rule';
                if (c === 'has_linkedin_url') lbl = 'Has LinkedIn URL?';
                else if (c === 'has_replied') lbl = 'Has Lead Replied?';
                else if (c === 'email_opened') lbl = 'Email Opened?';
                else if (c === 'link_clicked') lbl = 'Link Clicked?';

                onUpdateNodeData(node.id, {
                  conditionType: c,
                  label: lbl
                });
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-purple-500 font-bold"
            >
              <option value="email_opened">Email Was Opened</option>
              <option value="link_clicked">Link Was Clicked</option>
              <option value="has_linkedin_url">Has LinkedIn Profile URL</option>
              <option value="has_replied">Has Prospect Replied</option>
            </select>

            <div className="space-y-2 p-2.5 bg-purple-50/70 rounded-lg border border-purple-200 text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>YES Branch Path:</span>
              </div>
              <p className="text-slate-600 pl-3">
                Condition is satisfied. Lead advances through the green output handle.
              </p>

              <div className="flex items-center gap-1.5 text-rose-800 font-bold pt-1 border-t border-purple-200/60">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>NO Branch Path:</span>
              </div>
              <p className="text-slate-600 pl-3">
                Condition was not met. Lead routes through the red output handle.
              </p>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* MANUAL TASK NODE SPECIFIC SETTINGS                                 */}
        {/* ------------------------------------------------------------------ */}
        {nodeType === 'manual_task' && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Task Title</label>
              <input
                type="text"
                value={data.taskTitle || ''}
                onChange={(e) => onUpdateNodeData(node.id, { taskTitle: e.target.value })}
                placeholder="e.g. Call {{first_name}} regarding {{pain_point}}"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Task Instructions for User</label>
              <textarea
                rows={3}
                value={data.taskDescription || ''}
                onChange={(e) => onUpdateNodeData(node.id, { taskDescription: e.target.value })}
                placeholder="Review LinkedIn activity and leave brief phone message..."
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Due Within</label>
                <select
                  value={data.taskDueDateOffsetDays !== undefined ? data.taskDueDateOffsetDays : 1}
                  onChange={(e) => onUpdateNodeData(node.id, { taskDueDateOffsetDays: parseInt(e.target.value, 10) })}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value={0}>Same Day</option>
                  <option value={1}>1 Business Day</option>
                  <option value={2}>2 Business Days</option>
                  <option value={3}>3 Business Days</option>
                  <option value={5}>5 Business Days</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Priority</label>
                <select
                  value={data.taskPriority || 'medium'}
                  onChange={(e) => onUpdateNodeData(node.id, { taskPriority: e.target.value as any })}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 bg-blue-50 p-2 rounded-lg border border-blue-200">
              When a lead arrives at this step, a to-do item is posted to your <strong>Tasks Dashboard</strong>. The lead will pause until you complete the task.
            </p>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* MERGE NODE SPECIFIC SETTINGS                                       */}
        {/* ------------------------------------------------------------------ */}
        {nodeType === 'merge' && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <GitMerge className="w-4 h-4 text-slate-700" />
                <span>Rejoining Flow Branches</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Connect multiple incoming edges into this merge point. Any lead arriving from either branch continues down the single downstream path.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Inspector Actions Footer */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
        {nodeType !== 'start' ? (
          <button
            onClick={() => onDeleteNode(node.id)}
            className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        ) : (
          <span className="text-[10px] text-slate-400 font-medium">Start node is required</span>
        )}

        <div className="flex items-center gap-2">
          {nodeType !== 'start' && (
            <button
              onClick={() => onDuplicateNode(node.id)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Duplicate</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold shadow-2xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>

    </div>
  );
};
