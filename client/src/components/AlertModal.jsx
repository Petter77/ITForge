import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const AlertModal = ({ isOpen, onClose, title, message, type = 'info' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Auto-close after 3 seconds for success messages
      if (type === 'success') {
        const timer = setTimeout(() => {
          onClose();
        }, 3000);
        return () => {
          clearTimeout(timer);
          document.body.style.overflow = 'unset';
        };
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, type, onClose]);

  if (!isOpen) return null;

  const getIconAndColor = () => {
    switch (type) {
      case 'success':
        return {
          icon: (
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          bgColor: 'bg-green-100',
          iconColor: 'text-green-600',
        };
      case 'error':
        return {
          icon: (
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          ),
          bgColor: 'bg-red-100',
          iconColor: 'text-red-600',
        };
      default:
        return {
          icon: (
            <svg className="h-6 w-6 text-[#4E86D9]" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          ),
          bgColor: 'bg-blue-100',
          iconColor: 'text-[#4E86D9]',
        };
    }
  };

  const { icon, bgColor } = getIconAndColor();

  const modalContent = (
    <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-white/30 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative z-10 transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${bgColor} sm:mx-0 sm:h-10 sm:w-10`}>
                {icon}
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <h3 className="text-base font-semibold leading-6 text-gray-900" id="modal-title">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">{message}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex w-full justify-center rounded-md bg-[#4E86D9] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#3d6bb8] focus:outline-none focus:ring-2 focus:ring-[#4E86D9] focus:ring-offset-2 sm:w-auto transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AlertModal;

