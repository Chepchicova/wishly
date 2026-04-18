import './AuthModal.css';

export default function PrivacyModal({ onClose }) {
  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <section className="auth-modal privacy-modal" onClick={(event) => event.stopPropagation()}>
        <div className="auth-header-row">
          <h2 className="auth-title">Настройки приватности</h2>
          <button type="button" className="auth-close-button" onClick={onClose}>
            x
          </button>
        </div>
      </section>
    </div>
  );
}
