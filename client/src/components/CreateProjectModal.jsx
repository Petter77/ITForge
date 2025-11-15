import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const CreateProjectModal = ({ isOpen, onClose, onCreate }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Nazwa projektu jest wymagana');
      return;
    }

    setLoading(true);
    
    try {
      await onCreate(formData);
      setFormData({ name: '', description: '' });
      onClose();
    } catch (err) {
      setError(err.message || 'Nie udało się utworzyć projektu');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ name: '', description: '' });
      setError('');
      onClose();
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-white/30 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      ></div>

      {/* Center modal */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* Modal panel */}
        <div className="relative z-10 transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="w-full">
                  <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4" id="modal-title">
                    Utwórz Nowy Projekt
                  </h3>
                  
                  {error && (
                    <div className="mb-4 rounded bg-red-50 border border-red-200 p-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Nazwa Projektu <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4E86D9] focus:border-[#4E86D9] sm:text-sm"
                        placeholder="Mój Wspaniały Projekt"
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                        Opis
                      </label>
                      <textarea
                        name="description"
                        id="description"
                        rows="3"
                        value={formData.description}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4E86D9] focus:border-[#4E86D9] sm:text-sm"
                        placeholder="Krótki opis Twojego projektu..."
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full justify-center rounded-md bg-[#4E86D9] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#3d6bb8] focus:outline-none focus:ring-2 focus:ring-[#4E86D9] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto transition-colors"
              >
                {loading ? 'Tworzenie...' : 'Utwórz Projekt'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4E86D9] disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto transition-colors"
              >
                Anuluj
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CreateProjectModal;

