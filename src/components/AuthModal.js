import './AuthModal.css';

export default function AuthModal({
  authMode,
  onClose,
  onSetAuthMode,
  loginForm,
  onLoginFormChange,
  registerForm,
  onRegisterFormChange,
  onSubmitLogin,
  onSubmitRegister,
  authMessage,
  isAuthLoading,
}) {
  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <section className="auth-modal" onClick={(event) => event.stopPropagation()}>
        <div className="auth-header-row">
          <h2 className="auth-title">{authMode === 'login' ? 'Вход' : 'Регистрация'}</h2>
          <button type="button" className="auth-close-button" onClick={onClose}>
            x
          </button>
        </div>
        {authMode === 'login' ? (
          <p className="auth-switch-text">
            Нет аккаунта?{' '}
            <button type="button" className="auth-switch-link" onClick={() => onSetAuthMode('register')}>
              Зарегистрироваться
            </button>
          </p>
        ) : (
          <p className="auth-switch-text">
            Уже есть аккаунт?{' '}
            <button type="button" className="auth-switch-link" onClick={() => onSetAuthMode('login')}>
              Войти
            </button>
          </p>
        )}

        {authMode === 'login' ? (
          <form className="auth-form" onSubmit={onSubmitLogin}>
            <label>
              Имя
              <input
                required
                value={loginForm.name}
                onChange={(event) => onLoginFormChange({ ...loginForm, name: event.target.value })}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                required
                value={loginForm.email}
                onChange={(event) => onLoginFormChange({ ...loginForm, email: event.target.value })}
              />
            </label>
            <label>
              Пароль
              <input
                type="password"
                required
                value={loginForm.password}
                onChange={(event) => onLoginFormChange({ ...loginForm, password: event.target.value })}
              />
            </label>
            <button type="submit" className="action-btn primary-btn" disabled={isAuthLoading}>
              {isAuthLoading ? 'Загрузка...' : 'Войти'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={onSubmitRegister}>
            <label>
              Имя
              <input
                required
                value={registerForm.name}
                onChange={(event) => onRegisterFormChange({ ...registerForm, name: event.target.value })}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                required
                value={registerForm.email}
                onChange={(event) => onRegisterFormChange({ ...registerForm, email: event.target.value })}
              />
            </label>
            <label>
              День рождения
              <input
                type="date"
                value={registerForm.birthday}
                onChange={(event) =>
                  onRegisterFormChange({ ...registerForm, birthday: event.target.value })
                }
              />
            </label>
            <label>
              Пароль
              <input
                type="password"
                required
                value={registerForm.password}
                onChange={(event) =>
                  onRegisterFormChange({ ...registerForm, password: event.target.value })
                }
              />
            </label>
            <label>
              Повтор пароля
              <input
                type="password"
                required
                value={registerForm.passwordRepeat}
                onChange={(event) =>
                  onRegisterFormChange({ ...registerForm, passwordRepeat: event.target.value })
                }
              />
            </label>
            <button type="submit" className="action-btn primary-btn" disabled={isAuthLoading}>
              {isAuthLoading ? 'Загрузка...' : 'Зарегистрироваться'}
            </button>
          </form>
        )}

        {authMessage && <p className="auth-message">{authMessage}</p>}
      </section>
    </div>
  );
}
