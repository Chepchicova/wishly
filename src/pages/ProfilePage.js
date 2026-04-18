import { formatBirthdayForDisplay } from '../utils/dateFormat';
import './ProfilePage.css';

export default function ProfilePage({
  currentUser,
  onOpenLogin,
  profileData,
  isProfileLoading,
  profileMessage,
  profileForm,
  onProfileFormChange,
  isProfileEditMode,
  onSetProfileEditMode,
  onBeginProfileEdit,
  isProfileMenuOpen,
  onToggleProfileMenu,
  profileDotsMenuRef,
  showIdCopiedHint,
  onSaveProfile,
  onProfilePhotoChange,
  onCopyProfileId,
  onLogout,
}) {
  return (
    <section className="profile-page">
      {!currentUser ? (
        <div className="profile-card glass-bar">
          <h1>Профиль</h1>
          <p>Чтобы открыть профиль, сначала выполните вход.</p>
          <button type="button" className="action-btn primary-btn" onClick={onOpenLogin}>
            Войти
          </button>
        </div>
      ) : (
        <div className="profile-card glass-bar">
          <>
            <div className="profile-card-header">
              <h1 className="profile-page-title">Профиль</h1>
              <div className="dots-menu-wrap" ref={profileDotsMenuRef}>
                <button
                  type="button"
                  className="dots-btn"
                  aria-label="Меню профиля"
                  aria-expanded={isProfileMenuOpen}
                  onClick={onToggleProfileMenu}
                >
                  ...
                </button>
                {isProfileMenuOpen && (
                  <div className="dots-menu" role="menu">
                    <button type="button" role="menuitem" onClick={onBeginProfileEdit}>
                      Редактировать
                    </button>
                    <button type="button" role="menuitem" disabled>
                      Настройки
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isProfileLoading && <p className="profile-message">Загрузка...</p>}
            {!isProfileLoading && profileData && (
              <>
                <div className="profile-top-row">
                  <div className="profile-avatar-wrap">
                    {profileForm.photoDataUrl || profileData.photo_url ? (
                      <img
                        src={profileForm.photoDataUrl || `http://localhost:5000${profileData.photo_url}`}
                        alt="Фото профиля"
                        className="profile-avatar"
                      />
                    ) : (
                      <svg viewBox="0 0 24 24" className="profile-avatar-svg" aria-hidden>
                        <circle cx="12" cy="8" r="3.5" fill="currentColor" />
                        <path d="M5 19.5c0-3.5 3.5-5.5 7-5.5s7 2 7 5.5" fill="currentColor" />
                      </svg>
                    )}
                  </div>

                  <div className="profile-main-info">
                    <h1>{profileData.name}</h1>
                    <div className="profile-id-row">
                      <span className="profile-id-label">ID</span>
                      <button
                        type="button"
                        className="profile-id-value profile-id-clickable"
                        title="Нажмите, чтобы скопировать"
                        onClick={() => onCopyProfileId(profileData.id_user)}
                      >
                        {profileData.id_user}
                      </button>
                      {showIdCopiedHint && (
                        <span className="profile-id-copied-hint" role="status">
                          ID скопирован
                        </span>
                      )}
                    </div>
                    {profileData.birthday && (
                      <p className="profile-birthday-line">
                        Дата рождения: {formatBirthdayForDisplay(profileData.birthday)}
                      </p>
                    )}
                    {profileData.description_user && <p>Описание: {profileData.description_user}</p>}
                  </div>
                </div>

                {isProfileEditMode ? (
                  <form className="profile-edit-form" onSubmit={onSaveProfile}>
                    <label>
                      Имя
                      <input
                        required
                        value={profileForm.name}
                        onChange={(event) => onProfileFormChange({ ...profileForm, name: event.target.value })}
                      />
                    </label>
                    <label>
                      Дата рождения
                      <input
                        type="date"
                        value={profileForm.birthday}
                        onChange={(event) => onProfileFormChange({ ...profileForm, birthday: event.target.value })}
                      />
                    </label>
                    <label>
                      Описание
                      <textarea
                        rows={4}
                        value={profileForm.descriptionUser}
                        onChange={(event) =>
                          onProfileFormChange({ ...profileForm, descriptionUser: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Фото профиля
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={onProfilePhotoChange}
                      />
                    </label>
                    <div className="profile-form-actions">
                      <button type="submit" className="action-btn primary-btn">
                        Сохранить
                      </button>
                      <button type="button" className="action-btn" onClick={() => onSetProfileEditMode(false)}>
                        Отмена
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="profile-logout-row">
                    <button type="button" className="action-btn" onClick={onLogout}>
                      Выйти
                    </button>
                  </div>
                )}
              </>
            )}
          </>
          {profileMessage && <p className="profile-message">{profileMessage}</p>}
        </div>
      )}
    </section>
  );
}
