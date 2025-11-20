import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import AlertModal from './AlertModal';
import ConfirmModal from './ConfirmModal';

const defaultStatusOptions = [
  { value: 'open', label: 'Otwarte' },
  { value: 'monitoring', label: 'Monitorowane' },
  { value: 'resolved', label: 'Zarządzone' },
  { value: 'closed', label: 'Zamknięte' },
];

const RiskManagement = ({ projectId, userRole }) => {
  const canEdit = userRole === 'owner' || userRole === 'admin';
  const [risks, setRisks] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [riskModal, setRiskModal] = useState({ isOpen: false, risk: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, riskId: null, riskTitle: '' });
  const [scaleEditor, setScaleEditor] = useState({ isOpen: false });
  const [probabilityScaleDraft, setProbabilityScaleDraft] = useState([]);
  const [impactScaleDraft, setImpactScaleDraft] = useState([]);
  const [savingScale, setSavingScale] = useState(false);

  useEffect(() => {
    fetchRisks();
  }, [projectId]);

  const fetchRisks = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/projects/${projectId}/risks`);
      setRisks(response.data.risks || []);
      setSettings(response.data.settings);
    } catch (err) {
      console.error('Error fetching risks:', err);
      setError('Nie udało się załadować ryzyk projektu');
    } finally {
      setLoading(false);
    }
  };

  const openScaleEditor = () => {
    if (!settings) return;
    setProbabilityScaleDraft(settings.probabilityScale || []);
    setImpactScaleDraft(settings.impactScale || []);
    setScaleEditor({ isOpen: true });
  };

  const handleScaleChange = (type, index, field, value) => {
    const updater = type === 'probability' ? setProbabilityScaleDraft : setImpactScaleDraft;
    const current = type === 'probability' ? probabilityScaleDraft : impactScaleDraft;
    updater(current.map((entry, idx) => (idx === index ? { ...entry, [field]: value } : entry)));
  };

  const addScaleRow = (type) => {
    const updater = type === 'probability' ? setProbabilityScaleDraft : setImpactScaleDraft;
    const current = type === 'probability' ? probabilityScaleDraft : impactScaleDraft;
    const nextValue = current.length > 0 ? Math.max(...current.map((entry) => Number(entry.value) || 0)) + 1 : 1;
    updater([...current, { label: `Poziom ${nextValue}`, value: nextValue }]);
  };

  const removeScaleRow = (type, index) => {
    const updater = type === 'probability' ? setProbabilityScaleDraft : setImpactScaleDraft;
    const current = type === 'probability' ? probabilityScaleDraft : impactScaleDraft;
    if (current.length <= 1) return;
    updater(current.filter((_, idx) => idx !== index));
  };

  const saveScales = async () => {
    try {
      setSavingScale(true);
      await api.put(`/projects/${projectId}/risks/settings`, {
        probabilityScale: probabilityScaleDraft,
        impactScale: impactScaleDraft,
      });
      setAlertModal({
        isOpen: true,
        title: 'Sukces',
        message: 'Skale ryzyka zostały zaktualizowane',
        type: 'success',
      });
      setScaleEditor({ isOpen: false });
      await fetchRisks();
    } catch (err) {
      console.error('Error saving scales:', err);
      setAlertModal({
        isOpen: true,
        title: 'Błąd',
        message: err.response?.data?.message || 'Nie udało się zapisać skali',
        type: 'error',
      });
    } finally {
      setSavingScale(false);
    }
  };

  const handleRiskSave = async (riskData) => {
    try {
      if (riskModal.risk) {
        await api.put(`/projects/${projectId}/risks/${riskModal.risk.id}`, riskData);
        setAlertModal({
          isOpen: true,
          title: 'Sukces',
          message: 'Ryzyko zostało zaktualizowane pomyślnie',
          type: 'success',
        });
      } else {
        await api.post(`/projects/${projectId}/risks`, riskData);
        setAlertModal({
          isOpen: true,
          title: 'Sukces',
          message: 'Ryzyko zostało utworzone pomyślnie',
          type: 'success',
        });
      }
      setRiskModal({ isOpen: false, risk: null });
      await fetchRisks();
    } catch (err) {
      console.error('Error saving risk:', err);
      setAlertModal({
        isOpen: true,
        title: 'Błąd',
        message: err.response?.data?.message || 'Nie udało się zapisać ryzyka',
        type: 'error',
      });
    }
  };

  const handleDeleteRisk = async () => {
    if (!deleteConfirm.riskId) return;
    try {
      await api.delete(`/projects/${projectId}/risks/${deleteConfirm.riskId}`);
      setDeleteConfirm({ isOpen: false, riskId: null, riskTitle: '' });
      await fetchRisks();
      setAlertModal({
        isOpen: true,
        title: 'Sukces',
        message: 'Ryzyko zostało usunięte pomyślnie',
        type: 'success',
      });
    } catch (err) {
      console.error('Error deleting risk:', err);
      setDeleteConfirm({ isOpen: false, riskId: null, riskTitle: '' });
      setAlertModal({
        isOpen: true,
        title: 'Błąd',
        message: err.response?.data?.message || 'Nie udało się usunąć ryzyka',
        type: 'error',
      });
    }
  };

  const probabilityScale = useMemo(() => {
    if (!settings?.probabilityScale) return [];
    return [...settings.probabilityScale].sort((a, b) => (Number(a.value) || 0) - (Number(b.value) || 0));
  }, [settings]);

  const impactScale = useMemo(() => {
    if (!settings?.impactScale) return [];
    return [...settings.impactScale].sort((a, b) => (Number(a.value) || 0) - (Number(b.value) || 0));
  }, [settings]);

  const filteredRisks = risks.filter((risk) => filterStatus === 'all' || risk.status === filterStatus);

  const matrixData = useMemo(() => {
    const matrix = probabilityScale.map((prob) =>
      impactScale.map((impact) => ({
        probability: prob,
        impact,
        risks: filteredRisks.filter(
          (risk) => risk.probabilityValue === prob.value && risk.impactValue === impact.value
        ),
      }))
    );
    return matrix; // High probability at bottom (natural order)
  }, [probabilityScale, impactScale, filteredRisks]);

  const severityColor = (score) => {
    if (score >= 20) return 'bg-red-500 text-white';
    if (score >= 12) return 'bg-orange-500 text-white';
    if (score >= 8) return 'bg-yellow-500 text-white';
    if (score >= 4) return 'bg-green-500 text-white';
    return 'bg-gray-500 text-white';
  };

  const getMatrixCellStyle = (probValue, impactValue) => {
    const maxProbability = probabilityScale[probabilityScale.length - 1]?.value || 1;
    const maxImpact = impactScale[impactScale.length - 1]?.value || 1;
    const normalized = Math.min(1, (probValue * impactValue) / (maxProbability * maxImpact));
    const hue = 120 - normalized * 120; // 120 (green) -> 0 (red)
    const lightness = 90 - normalized * 25; // lighter for low, darker for high
    return {
      backgroundColor: `hsl(${hue}, 75%, ${lightness}%)`,
      borderColor: `hsl(${hue}, 60%, ${Math.max(40, lightness - 25)}%)`,
      transition: 'background-color 0.2s ease',
    };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-gray-600">Ładowanie ryzyk...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Zarządzanie Ryzykiem</h2>
          <p className="text-gray-600 mt-1">
            Identyfikuj, oceniaj i monitoruj ryzyka projektu. Definiuj własne skale prawdopodobieństwa i wpływu.
          </p>
        </div>
        <div className="flex gap-3">
          {canEdit && (
            <>
              <button
                onClick={() => setRiskModal({ isOpen: true, risk: null })}
                className="px-4 py-2 bg-[#4E86D9] text-white rounded-md hover:bg-[#3d6bb8] transition-colors"
              >
                + Dodaj ryzyko
              </button>
              <button
                onClick={openScaleEditor}
                className="px-4 py-2 text-[#4E86D9] border border-[#4E86D9] rounded-md hover:bg-[#4E86D9] hover:text-white transition-colors"
              >
                Edytuj skale
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
        >
          <option value="all">Wszystkie</option>
          {defaultStatusOptions.map((status) => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>
      </div>

 	    {filteredRisks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500">Brak zidentyfikowanych ryzyk</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ryzyko</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prawdopodobieństwo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wpływ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wynik</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan reakcji</th>
                {canEdit && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRisks.map((risk) => (
                <tr key={risk.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{risk.title}</div>
                    {risk.description && (
                      <div className="text-sm text-gray-500">{risk.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{risk.probabilityLabel}</span>
                      <span className="text-xs text-gray-500">({risk.probabilityValue})</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{risk.impactLabel}</span>
                      <span className="text-xs text-gray-500">({risk.impactValue})</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${severityColor(risk.severityScore)}`}>
                      {risk.severityScore}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                      {defaultStatusOptions.find((opt) => opt.value === risk.status)?.label || risk.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {risk.responsePlan || 'Brak planu'}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => setRiskModal({ isOpen: true, risk })}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ isOpen: true, riskId: risk.id, riskTitle: risk.title })}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Risk Matrix */}
      {probabilityScale.length > 0 && impactScale.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Macierz Ryzyka</h3>
          <div className="overflow-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="grid" style={{ gridTemplateColumns: `120px repeat(${impactScale.length}, minmax(120px, 1fr))` }}>
                <div></div>
                {impactScale.map((impact) => (
                  <div key={impact.value} className="text-center font-semibold text-gray-700">
                    {impact.label}
                  </div>
                ))}
                {matrixData.map((row, rowIndex) => (
                  <>
                    <div key={`prob-${rowIndex}`} className="flex items-center justify-center font-semibold text-gray-700">
                      {row[0].probability.label}
                    </div>
                    {row.map((cell, cellIndex) => (
                      <div
                        key={`${rowIndex}-${cellIndex}`}
                        className="border min-h-[100px] p-2 relative rounded-md"
                        style={getMatrixCellStyle(cell.probability.value, cell.impact.value)}
                      >
                        {cell.risks.length > 0 ? (
                          <div className="space-y-1">
                            {cell.risks.slice(0, 3).map((risk) => (
                              <div key={risk.id} className="p-1 rounded bg-gray-100 text-xs text-gray-700 truncate">
                                {risk.title}
                              </div>
                            ))}
                            {cell.risks.length > 3 && (
                              <div className="text-xs text-gray-500">+ {cell.risks.length - 3} więcej</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-300 text-center">Brak</div>
                        )}
                        <div className="absolute top-1 right-1 text-[10px] text-gray-400">
                          P: {cell.probability.value} / W: {cell.impact.value}
                        </div>
                      </div>
                    ))}
                  </>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {riskModal.isOpen && (
        <RiskModal
          isOpen={riskModal.isOpen}
          onClose={() => setRiskModal({ isOpen: false, risk: null })}
          risk={riskModal.risk}
          onSave={handleRiskSave}
          probabilityScale={probabilityScale}
          impactScale={impactScale}
          canEdit={canEdit}
        />
      )}

      {scaleEditor.isOpen && (
        <ScaleModal
          isOpen={scaleEditor.isOpen}
          onClose={() => setScaleEditor({ isOpen: false })}
          probabilityScale={probabilityScaleDraft}
          impactScale={impactScaleDraft}
          onChange={handleScaleChange}
          onAddRow={addScaleRow}
          onRemoveRow={removeScaleRow}
          onSave={saveScales}
          saving={savingScale}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, riskId: null, riskTitle: '' })}
        onConfirm={handleDeleteRisk}
        title="Usuń ryzyko"
        message={`Czy na pewno chcesz usunąć ryzyko "${deleteConfirm.riskTitle}"? Tej operacji nie można cofnąć.`}
        confirmText="Usuń"
        cancelText="Anuluj"
        type="danger"
      />

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, title: '', message: '', type: 'info' })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
};

const RiskModal = ({ isOpen, onClose, risk, onSave, probabilityScale, impactScale, canEdit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [probabilityValue, setProbabilityValue] = useState(null);
  const [impactValue, setImpactValue] = useState(null);
  const [status, setStatus] = useState('open');
  const [responsePlan, setResponsePlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (risk) {
        setTitle(risk.title || '');
        setDescription(risk.description || '');
        setProbabilityValue(risk.probabilityValue);
        setImpactValue(risk.impactValue);
        setStatus(risk.status || 'open');
        setResponsePlan(risk.responsePlan || '');
      } else {
        setTitle('');
        setDescription('');
        setProbabilityValue(probabilityScale[0]?.value || null);
        setImpactValue(impactScale[0]?.value || null);
        setStatus('open');
        setResponsePlan('');
      }
      setError('');
    }
  }, [isOpen, risk, probabilityScale, impactScale]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!probabilityValue || !impactValue) {
      setError('Wybierz wartości dla prawdopodobieństwa i wpływu');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const probabilityEntry = probabilityScale.find((entry) => entry.value === Number(probabilityValue));
      const impactEntry = impactScale.find((entry) => entry.value === Number(impactValue));
      await onSave({
        title,
        description: description || null,
        probabilityValue: Number(probabilityValue),
        probabilityLabel: probabilityEntry?.label || '',
        impactValue: Number(impactValue),
        impactLabel: impactEntry?.label || '',
        status,
        responsePlan: responsePlan || null,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Nie udało się zapisać ryzyka');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              {risk ? 'Edytuj ryzyko' : 'Nowe ryzyko'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tytuł <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
                  placeholder="Zidentyfikowane ryzyko"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
                >
                  {defaultStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opis</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
                placeholder="Szczegóły dotyczące ryzyka"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prawdopodobieństwo</label>
                <select
                  value={probabilityValue ?? ''}
                  onChange={(e) => setProbabilityValue(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
                >
                  {probabilityScale.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wpływ</label>
                <select
                  value={impactValue ?? ''}
                  onChange={(e) => setImpactValue(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
                >
                  {impactScale.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan reakcji</label>
              <textarea
                value={responsePlan}
                onChange={(e) => setResponsePlan(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
                placeholder="Działania korygujące, plan awaryjny, monitoring"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[#4E86D9] text-white rounded-md hover:bg-[#3d6bb8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Zapisywanie...' : risk ? 'Zaktualizuj' : 'Utwórz'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const ScaleModal = ({
  isOpen,
  onClose,
  probabilityScale,
  impactScale,
  onChange,
  onAddRow,
  onRemoveRow,
  onSave,
  saving,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Konfiguracja skali ryzyka</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ScaleEditor
              title="Skala prawdopodobieństwa"
              entries={probabilityScale}
              onChange={(index, field, value) => onChange('probability', index, field, value)}
              onAddRow={() => onAddRow('probability')}
              onRemoveRow={(index) => onRemoveRow('probability', index)}
            />
            <ScaleEditor
              title="Skala wpływu"
              entries={impactScale}
              onChange={(index, field, value) => onChange('impact', index, field, value)}
              onAddRow={() => onAddRow('impact')}
              onRemoveRow={(index) => onRemoveRow('impact', index)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="px-4 py-2 bg-[#4E86D9] text-white rounded-md hover:bg-[#3d6bb8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Zapisywanie...' : 'Zapisz skale'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ScaleEditor = ({ title, entries, onChange, onAddRow, onRemoveRow }) => (
  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <button
        type="button"
        onClick={onAddRow}
        className="text-sm text-[#4E86D9] hover:text-[#3d6bb8]"
      >
        + Dodaj poziom
      </button>
    </div>
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <div key={index} className="flex gap-2">
          <input
            type="number"
            value={entry.value}
            min={1}
            onChange={(e) => onChange(index, 'value', Number(e.target.value))}
            className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
            placeholder="Wartość"
          />
          <input
            type="text"
            value={entry.label}
            onChange={(e) => onChange(index, 'label', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
            placeholder="Opis poziomu"
          />
          {entries.length > 1 && (
            <button
              type="button"
              onClick={() => onRemoveRow(index)}
              className="px-3 py-2 text-gray-400 hover:text-red-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  </div>
);

export default RiskManagement;

